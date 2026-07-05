import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { PrismaService } from '../prisma/prisma.service';
import { AiQuotaService } from './ai-quota.service';
import { AiToolRegistry } from './ai-tool.registry';
import type {
  CopilotChatMessage,
  CopilotLlmAction,
  CopilotSource,
} from './ai.types';
import { CloudflareAiService } from './cloudflare-ai.service';

const SYSTEM_PROMPT = `Tu es TimeGate Copilot, assistant RH pour managers.
Règles:
- Réponds en français, de façon concise et professionnelle.
- Ne jamais inventer de chiffres: utilise uniquement les données des outils.
- Tu ne peux pas approuver de congés ni modifier des données (read-only).
- Si la question est hors périmètre, indique ce que tu peux faire (présences, retards, validations, kiosks, heures sup).
- Réponds UNIQUEMENT en JSON valide sans markdown:
  {"action":"tool","tool":"nom_outil","arguments":{...}}
  ou {"action":"answer","text":"...","sources":[{"label":"...","href":"..."}]}`;

@Injectable()
export class AiCopilotService {
  private readonly logger = new Logger(AiCopilotService.name);
  private readonly maxToolRounds: number;
  private readonly sessionTtlHours: number;
  private readonly maxMessages = 20;

  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: AiQuotaService,
    private readonly cloudflare: CloudflareAiService,
    private readonly tools: AiToolRegistry,
    private readonly config: ConfigService,
  ) {
    this.maxToolRounds = Number(this.config.get<string>('AI_COPILOT_MAX_TOOL_ROUNDS') ?? '3');
    this.sessionTtlHours = Number(this.config.get<string>('AI_COPILOT_SESSION_TTL_HOURS') ?? '24');
  }

  async chat(user: JwtUser, message: string, sessionId?: string) {
    const companyId = user.companyId;
    if (!companyId) throw new BadRequestException('Organisation requise');

    await this.quota.assertCanUseCopilot(companyId);

    if (!this.cloudflare.isEnabled()) {
      throw new ServiceUnavailableException(
        'Cloudflare AI non configuré. Définissez CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_AI_API_TOKEN.',
      );
    }

    const session = await this.loadOrCreateSession(user, sessionId);
    const history = this.normalizeHistory(session.messages);
    history.push({ role: 'user', content: message.trim(), createdAt: new Date().toISOString() });

    const tools = this.tools.getDefinitions();
    let totalInput = 0;
    let totalOutput = 0;
    let model = 'stub';
    const allSources: CopilotSource[] = [];

    let llmMessages: CopilotChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.filter((m) => m.role === 'user' || m.role === 'assistant'),
    ];

    let finalText = '';
    let rounds = 0;
    let lastTool: string | null = null;
    let lastToolData: unknown = null;

    while (rounds < this.maxToolRounds) {
      rounds += 1;

      const action = await this.resolveAction(message, llmMessages, tools, user);

      if (action.action === 'tool') {
        lastTool = action.tool;
        const { data, sources } = await this.tools.execute(action.tool, action.arguments, user);
        lastToolData = data;
        allSources.push(...sources);
        llmMessages = [
          ...llmMessages,
          {
            role: 'assistant',
            content: JSON.stringify({ action: 'tool', tool: action.tool, arguments: action.arguments }),
          },
          { role: 'tool', content: JSON.stringify(data) },
        ];
        if (rounds >= this.maxToolRounds) {
          finalText = this.synthesizeFromToolData(action.tool, data, sources);
          break;
        }
        continue;
      }

      finalText = action.text;
      if (action.sources?.length) allSources.push(...action.sources);
      break;
    }

    if (!finalText && lastTool && lastToolData) {
      finalText = this.synthesizeFromToolData(lastTool, lastToolData, allSources);
    }

    if (!finalText) {
      finalText =
        'Je n’ai pas pu trouver de réponse. Essayez une question plus précise (ex. « Qui est absent aujourd’hui ? »).';
    }

    const uniqueSources = this.dedupeSources(allSources);
    model = this.cloudflare.isEnabled() ? 'cloudflare' : 'local';

    await this.quota.recordUsage({
      companyId,
      userId: user.sub,
      feature: 'copilot',
      inputTokens: totalInput || Math.ceil(message.length / 4),
      outputTokens: totalOutput || Math.ceil(finalText.length / 4),
      model,
    });

    history.push({ role: 'assistant', content: finalText, createdAt: new Date().toISOString() });
    const trimmed = history.slice(-this.maxMessages);
    await this.prisma.aiCopilotSession.update({
      where: { id: session.id },
      data: { messages: trimmed },
    });

    return {
      sessionId: session.id,
      text: finalText,
      sources: uniqueSources,
      usage: await this.quota.getUsageSummary(companyId),
    };
  }

  async getSession(user: JwtUser, sessionId: string) {
    const companyId = user.companyId;
    if (!companyId) throw new BadRequestException('Organisation requise');
    const session = await this.prisma.aiCopilotSession.findFirst({
      where: { id: sessionId, companyId, userId: user.sub },
    });
    if (!session) throw new NotFoundException('Session introuvable');
    return {
      id: session.id,
      messages: this.normalizeHistory(session.messages),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  getUsage(companyId: string) {
    return this.quota.getUsageSummary(companyId);
  }

  getUsageHistory(companyId: string) {
    return this.quota.getUsageHistory(companyId);
  }

  private async resolveAction(
    originalMessage: string,
    messages: CopilotChatMessage[],
    tools: ReturnType<AiToolRegistry['getDefinitions']>,
    user: JwtUser,
  ): Promise<CopilotLlmAction> {
    const result = await this.cloudflare.chat({
      messages,
      tools,
      metadata: {
        companyId: user.companyId!,
        userId: user.sub,
        feature: 'copilot',
      },
    });

    try {
      return this.parseAction(result.content);
    } catch {
      return {
        action: 'answer',
        text: result.content.slice(0, 2000),
      };
    }
  }

  private parseAction(content: string): CopilotLlmAction {
    const trimmed = content.trim();
    const jsonText = trimmed.startsWith('{')
      ? trimmed
      : trimmed.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) throw new BadRequestException('Réponse IA invalide');
    const parsed = JSON.parse(jsonText) as CopilotLlmAction;
    if (parsed.action === 'tool' && parsed.tool) {
      return {
        action: 'tool',
        tool: parsed.tool,
        arguments: (parsed.arguments as Record<string, unknown>) ?? {},
      };
    }
    if (parsed.action === 'answer' && typeof parsed.text === 'string') {
      return { action: 'answer', text: parsed.text, sources: parsed.sources };
    }
    throw new BadRequestException('Format action IA invalide');
  }

  private synthesizeFromToolData(tool: string, data: unknown, sources: CopilotSource[]): string {
    const payload = data as Record<string, unknown>;
    switch (tool) {
      case 'get_team_today': {
        const count = payload.count as number;
        const date = payload.date as string;
        const members = (payload.members as Array<{ name: string; status: string; branch: string | null }>) ?? [];
        if (count === 0) return `Aucun employé ne correspond au filtre pour le ${date}.`;
        const lines = members.slice(0, 15).map((m) => `• ${m.name} (${m.status})${m.branch ? ` — ${m.branch}` : ''}`);
        return `Équipe du ${date} — ${count} résultat(s):\n${lines.join('\n')}`;
      }
      case 'get_manager_inbox': {
        const counts = payload.counts as { total?: number };
        return `Il y a ${counts?.total ?? 0} élément(s) en attente de validation. Consultez la boîte de réception manager.`;
      }
      case 'get_kiosk_status': {
        const total = payload.total as number;
        const kiosks = (payload.kiosks as Array<{ name: string; status: string }>) ?? [];
        if (total === 0) return 'Tous les kiosks sont en ligne.';
        return `${total} kiosk(s) concerné(s):\n${kiosks.map((k) => `• ${k.name} — ${k.status}`).join('\n')}`;
      }
      case 'get_overtime_leaders': {
        const leaders = (payload.leaders as Array<{ employee: { name: string } | null; overtimeMinutes: number }>) ?? [];
        if (!leaders.length) return 'Aucune heure supplémentaire enregistrée sur la période.';
        return `Top heures sup:\n${leaders.map((l, i) => `${i + 1}. ${l.employee?.name ?? 'Employé'} — ${l.overtimeMinutes} min`).join('\n')}`;
      }
      case 'get_weekly_anomalies': {
        const lines = (payload.lines as string[]) ?? [];
        if (!lines.length) return 'Aucune anomalie significative sur la période.';
        return lines.map((l) => `• ${l}`).join('\n');
      }
      case 'get_late_records': {
        const total = payload.total as number;
        return `${total ?? 0} retard(s) enregistré(s) sur la période.`;
      }
      default:
        return JSON.stringify(payload).slice(0, 1500);
    }
  }

  private dedupeSources(sources: CopilotSource[]): CopilotSource[] {
    const seen = new Set<string>();
    return sources.filter((s) => {
      if (seen.has(s.href)) return false;
      seen.add(s.href);
      return true;
    });
  }

  private async loadOrCreateSession(user: JwtUser, sessionId?: string) {
    const companyId = user.companyId!;
    const cutoff = new Date(Date.now() - this.sessionTtlHours * 60 * 60 * 1000);

    if (sessionId) {
      const existing = await this.prisma.aiCopilotSession.findFirst({
        where: {
          id: sessionId,
          companyId,
          userId: user.sub,
          updatedAt: { gte: cutoff },
        },
      });
      if (existing) return existing;
    }

    return this.prisma.aiCopilotSession.create({
      data: {
        id: generateDocId('AICP'),
        companyId,
        userId: user.sub,
        messages: [],
      },
    });
  }

  private normalizeHistory(value: unknown): CopilotChatMessage[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is CopilotChatMessage =>
          !!item &&
          typeof item === 'object' &&
          'role' in item &&
          'content' in item &&
          typeof (item as CopilotChatMessage).content === 'string',
      )
      .map((item) => ({
        role: item.role,
        content: item.content,
        createdAt: item.createdAt,
      }));
  }
}
