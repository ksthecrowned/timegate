import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CloudflareChatResult, CopilotChatMessage, CopilotToolDefinition } from './ai.types';

@Injectable()
export class CloudflareAiService {
  private readonly logger = new Logger(CloudflareAiService.name);
  private readonly accountId: string | null;
  private readonly gatewayId: string | null;
  private readonly apiToken: string | null;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.accountId =
      this.config.get<string>('CLOUDFLARE_ACCOUNT_ID')?.trim() ??
      this.config.get<string>('R2_ACCOUNT_ID')?.trim() ??
      null;
    this.gatewayId = this.config.get<string>('CLOUDFLARE_AI_GATEWAY_ID')?.trim() ?? null;
    this.apiToken = this.config.get<string>('CLOUDFLARE_AI_API_TOKEN')?.trim() ?? null;
    this.model =
      this.config.get<string>('CLOUDFLARE_AI_MODEL')?.trim() ?? '@cf/qwen/qwen3-30b-a3b-fp8';
    this.timeoutMs = Number(this.config.get<string>('AI_COPILOT_REQUEST_TIMEOUT_MS') ?? '30000');

    if (!this.accountId || !this.apiToken) {
      this.logger.warn(
        'Cloudflare AI disabled: set CLOUDFLARE_ACCOUNT_ID (or R2_ACCOUNT_ID) and CLOUDFLARE_AI_API_TOKEN',
      );
    }
  }

  isEnabled(): boolean {
    return Boolean(this.accountId && this.apiToken);
  }

  async chat(params: {
    messages: CopilotChatMessage[];
    tools: CopilotToolDefinition[];
    metadata: { companyId: string; userId: string; feature: string };
  }): Promise<CloudflareChatResult> {
    this.assertConfigured();

    const systemTools = params.tools
      .map(
        (tool) =>
          `- ${tool.name}: ${tool.description}\n  Paramètres: ${JSON.stringify(tool.parameters)}`,
      )
      .join('\n');

    const systemContent = params.messages.find((m) => m.role === 'system')?.content ?? '';
    const conversation = params.messages.filter((m) => m.role !== 'system');

    const messages = [
      {
        role: 'system' as const,
        content: this.buildSystemContent(systemContent, systemTools),
      },
      ...conversation.map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'user' as const,
            content: `Résultat outil (JSON):\n${m.content}`,
          };
        }
        return {
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        };
      }),
    ];

    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/v1/chat/completions`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
    if (this.gatewayId) {
      headers['cf-aig-gateway-id'] = this.gatewayId;
      headers['cf-aig-metadata'] = JSON.stringify(params.metadata);
    }

    const body = JSON.stringify({
      model: this.model,
      messages,
      max_tokens: 2048,
      temperature: 0.2,
      ...(this.isQwenModel() ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        this.logger.warn(`Cloudflare AI error ${response.status}: ${detail.slice(0, 400)}`);
        if (response.status === 401 || response.status === 403) {
          throw new ServiceUnavailableException(
            'Authentification Cloudflare AI invalide. Vérifiez CLOUDFLARE_AI_API_TOKEN (token Workers AI) et les permissions du gateway.',
          );
        }
        throw new ServiceUnavailableException('Service IA temporairement indisponible.');
      }

      const json = (await response.json()) as Record<string, unknown>;
      const content = this.extractContent(json);
      if (!content.trim()) {
        this.logger.warn(`Cloudflare AI empty content: ${JSON.stringify(json).slice(0, 500)}`);
        throw new ServiceUnavailableException(
          'Le modèle IA n’a pas renvoyé de contenu. Réessayez ou changez de modèle.',
        );
      }
      const usage = this.extractUsage(json, params.messages, content);

      return {
        content,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        model: this.model,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(
        `Cloudflare AI request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException('Service IA temporairement indisponible.');
    } finally {
      clearTimeout(timer);
    }
  }

  private assertConfigured() {
    if (!this.accountId || !this.apiToken) {
      throw new ServiceUnavailableException(
        'Cloudflare AI non configuré (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_API_TOKEN requis).',
      );
    }
  }

  private isQwenModel(): boolean {
    return this.model.toLowerCase().includes('qwen');
  }

  private buildSystemContent(base: string, tools: string): string {
    const thinkingHint = this.isQwenModel() ? '\n/no_think' : '';
    return `${base}\n\nOutils disponibles:\n${tools}${thinkingHint}`;
  }

  private extractContent(json: Record<string, unknown>): string {
    const choice = (json.choices as Array<{ message?: Record<string, unknown> }> | undefined)?.[0]
      ?.message;
    if (choice) {
      const content = choice.content;
      if (typeof content === 'string' && content.trim()) return content;

      const reasoning = choice.reasoning_content ?? choice.reasoning;
      if (typeof reasoning === 'string' && reasoning.trim()) return reasoning;

      const toolCalls = choice.tool_calls as Array<{ function?: { arguments?: string } }> | undefined;
      if (toolCalls?.length) {
        const call = toolCalls[0];
        const name = (call as { function?: { name?: string } }).function?.name;
        const args = call.function?.arguments;
        if (name) {
          return JSON.stringify({
            action: 'tool',
            tool: name,
            arguments: args ? JSON.parse(args) : {},
          });
        }
      }
    }

    const result = json.result as Record<string, unknown> | undefined;
    if (typeof result?.response === 'string' && result.response.trim()) return result.response;
    if (typeof json.response === 'string' && json.response.trim()) return json.response;

    return '';
  }

  private extractUsage(
    json: Record<string, unknown>,
    messages: CopilotChatMessage[],
    content: string,
  ) {
    const usage = json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
    if (usage?.prompt_tokens != null) {
      return {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens ?? Math.ceil(content.length / 4),
      };
    }
    const inputChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return {
      inputTokens: Math.ceil(inputChars / 4),
      outputTokens: Math.ceil(content.length / 4),
    };
  }
}
