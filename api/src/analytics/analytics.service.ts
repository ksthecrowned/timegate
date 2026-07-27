import { ForbiddenException, Injectable } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { PrismaService } from '../prisma/prisma.service';
import { TrackAnalyticsEventDto } from './dto/analytics.dto';

/** Funnel events (product analytics) — keep allowlist tight. */
export const TRACKED_EVENTS = [
  'employee.login_success',
  'employee.qr_punch_success',
  'employee.leave_request_submitted',
] as const;

export type TrackedEvent = (typeof TRACKED_EVENTS)[number];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(dto: TrackAnalyticsEventDto, user: JwtUser) {
    if (!user.companyId) {
      throw new ForbiddenException('Company required');
    }
    if (!TRACKED_EVENTS.includes(dto.event as TrackedEvent)) {
      // Accept silently for forward-compat client versions, but do not persist unknown events.
      return { ok: true, stored: false };
    }

    await this.prisma.timeGateAnalyticsEvent.create({
      data: {
        id: generateDocId('aevt'),
        companyId: user.companyId,
        userId: user.sub,
        event: dto.event,
        platform: dto.platform ?? null,
      },
    });
    return { ok: true, stored: true };
  }

  async funnel(user: JwtUser, daysRaw?: number) {
    if (
      !user.companyId ||
      (user.role !== TimeGateUserRole.ADMIN && user.role !== TimeGateUserRole.MANAGER)
    ) {
      throw new ForbiddenException('Manager access required');
    }

    const days = Math.min(90, Math.max(1, daysRaw ?? 30));
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const rows = await this.prisma.timeGateAnalyticsEvent.findMany({
      where: {
        companyId: user.companyId,
        createdAt: { gte: since },
        event: { in: [...TRACKED_EVENTS] },
      },
      select: {
        event: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totals: Record<string, { total: number; uniqueUsers: number }> = {};
    for (const event of TRACKED_EVENTS) {
      totals[event] = { total: 0, uniqueUsers: 0 };
    }

    const uniqueByEvent = new Map<string, Set<string>>();
    const dailyMap = new Map<
      string,
      { date: string; login: number; qr: number; leave: number }
    >();

    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, login: 0, qr: 0, leave: 0 });
    }

    for (const row of rows) {
      const bucket = totals[row.event];
      if (bucket) {
        bucket.total += 1;
        if (row.userId) {
          let set = uniqueByEvent.get(row.event);
          if (!set) {
            set = new Set();
            uniqueByEvent.set(row.event, set);
          }
          set.add(row.userId);
        }
      }

      const dayKey = row.createdAt.toISOString().slice(0, 10);
      const day = dailyMap.get(dayKey);
      if (day) {
        if (row.event === 'employee.login_success') day.login += 1;
        else if (row.event === 'employee.qr_punch_success') day.qr += 1;
        else if (row.event === 'employee.leave_request_submitted') day.leave += 1;
      }
    }

    for (const event of TRACKED_EVENTS) {
      totals[event].uniqueUsers = uniqueByEvent.get(event)?.size ?? 0;
    }

    const loginUsers = totals['employee.login_success'].uniqueUsers;
    const qrUsers = totals['employee.qr_punch_success'].uniqueUsers;
    const leaveUsers = totals['employee.leave_request_submitted'].uniqueUsers;

    return {
      days,
      since: since.toISOString(),
      events: totals,
      conversion: {
        loginToQr: rate(qrUsers, loginUsers),
        loginToLeave: rate(leaveUsers, loginUsers),
        qrToLeave: rate(leaveUsers, qrUsers),
      },
      daily: [...dailyMap.values()],
    };
  }
}

function rate(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}
