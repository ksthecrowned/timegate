import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, interval, map, merge, finalize } from 'rxjs';

export type KioskAccessRevokeReason = 'reset' | 'deactivated' | 'deleted';

/**
 * In-memory SSE fan-out per kiosk.
 * Note: multi-instance deployments need a shared bus (Redis) later.
 */
@Injectable()
export class KioskRealtimeService {
  private readonly channels = new Map<string, Subject<MessageEvent>>();
  private readonly refCounts = new Map<string, number>();

  stream(kioskId: string): Observable<MessageEvent> {
    const channel = this.getOrCreate(kioskId);
    this.refCounts.set(kioskId, (this.refCounts.get(kioskId) ?? 0) + 1);

    const connected$: Observable<MessageEvent> = new Observable((subscriber) => {
      subscriber.next({
        type: 'connected',
        data: { kioskId },
      });
      subscriber.complete();
    });

    const keepAlive$ = interval(20_000).pipe(
      map(
        (): MessageEvent => ({
          type: 'ping',
          data: { t: Date.now() },
        }),
      ),
    );

    return merge(connected$, channel.asObservable(), keepAlive$).pipe(
      finalize(() => {
        const next = (this.refCounts.get(kioskId) ?? 1) - 1;
        if (next <= 0) {
          this.refCounts.delete(kioskId);
          const subject = this.channels.get(kioskId);
          this.channels.delete(kioskId);
          subject?.complete();
        } else {
          this.refCounts.set(kioskId, next);
        }
      }),
    );
  }

  emitAccessRevoked(kioskId: string, reason: KioskAccessRevokeReason) {
    const channel = this.channels.get(kioskId);
    if (!channel) return;
    channel.next({
      type: 'access_revoked',
      data: { reason, at: new Date().toISOString() },
    });
  }

  private getOrCreate(kioskId: string): Subject<MessageEvent> {
    let channel = this.channels.get(kioskId);
    if (!channel || channel.closed) {
      channel = new Subject<MessageEvent>();
      this.channels.set(kioskId, channel);
    }
    return channel;
  }
}
