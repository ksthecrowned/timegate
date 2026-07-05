import { ForbiddenException, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AiPlanFeatures } from './ai.types';

export type AiUsageSummary = {
  enabled: boolean;
  usedTokens: number;
  quotaTokens: number | null;
  percent: number | null;
  unlimited: boolean;
};

const DEFAULT_FEATURES: AiPlanFeatures = {
  aiCopilotEnabled: true,
  aiTokensPerMonth: 500_000,
};

@Injectable()
export class AiQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  private monthBounds(now = new Date()) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start, end };
  }

  async getPlanFeatures(companyId: string): Promise<AiPlanFeatures> {
    const subscription = await this.prisma.timeGateSubscription.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: { planRef: { select: { features: true } } },
    });
    const raw = subscription?.planRef?.features;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return DEFAULT_FEATURES;
    }
    return { ...DEFAULT_FEATURES, ...(raw as AiPlanFeatures) };
  }

  async getUsageSummary(companyId: string): Promise<AiUsageSummary> {
    const features = await this.getPlanFeatures(companyId);
    const enabled = features.aiCopilotEnabled !== false;
    const quotaTokens =
      features.aiTokensPerMonth === undefined ? DEFAULT_FEATURES.aiTokensPerMonth! : features.aiTokensPerMonth;
    const unlimited = quotaTokens === null;

    const { start, end } = this.monthBounds();
    const rows = await this.prisma.aiUsageRecord.findMany({
      where: {
        companyId,
        feature: 'copilot',
        createdAt: { gte: start, lt: end },
      },
      select: { inputTokens: true, outputTokens: true },
    });

    const usedTokens = rows.reduce((sum, row) => sum + row.inputTokens + row.outputTokens, 0);
    const percent =
      unlimited || !quotaTokens ? null : Math.min(100, Math.round((usedTokens / quotaTokens) * 100));

    return { enabled, usedTokens, quotaTokens: unlimited ? null : quotaTokens, percent, unlimited };
  }

  async assertCanUseCopilot(companyId: string, estimatedTokens = 0) {
    const summary = await this.getUsageSummary(companyId);
    if (!summary.enabled) {
      throw new ForbiddenException('Le copilote IA n’est pas activé pour votre abonnement.');
    }
    if (summary.unlimited || summary.quotaTokens === null) return summary;
    if (summary.usedTokens + estimatedTokens > summary.quotaTokens) {
      throw new HttpException(
        'Quota IA mensuel atteint pour votre organisation.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return summary;
  }

  async recordUsage(params: {
    companyId: string;
    userId?: string;
    feature: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
  }) {
    const { generateDocId } = await import('../common/utils/doc-id.util');
    await this.prisma.aiUsageRecord.create({
      data: {
        id: generateDocId('AIUS'),
        companyId: params.companyId,
        userId: params.userId ?? null,
        feature: params.feature,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        model: params.model,
      },
    });
  }

  async getUsageHistory(companyId: string) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);
    const rows = await this.prisma.aiUsageRecord.findMany({
      where: { companyId, feature: 'copilot', createdAt: { gte: since } },
      select: { inputTokens: true, outputTokens: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const daily = new Map<string, number>();
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      daily.set(key, (daily.get(key) ?? 0) + row.inputTokens + row.outputTokens);
    }
    const sessions = await this.prisma.aiCopilotSession.count({
      where: { companyId, updatedAt: { gte: since } },
    });
    return {
      daily: [...daily.entries()].map(([date, tokens]) => ({ date, tokens })),
      sessions,
    };
  }
}
