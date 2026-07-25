import * as SecureStore from 'expo-secure-store';

import { ApiError, employeeApi } from './api';

export { isNetworkishError } from './networkError';

const QUEUE_KEY = 'timegate_qr_offline_queue';

export type QrOfflineItem = {
  clientId: string;
  payload: string;
  scannedAt: string;
};

export type QrSyncSummary = {
  synced: number;
  failed: number;
  pending: number;
  lastMessage?: string;
  lastErrorCode?: string;
};

function randomClientId(): string {
  return `qr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readQueue(): Promise<QrOfflineItem[]> {
  const raw = await SecureStore.getItemAsync(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QrOfflineItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QrOfflineItem[]): Promise<void> {
  if (items.length === 0) {
    await SecureStore.deleteItemAsync(QUEUE_KEY);
    return;
  }
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(items));
}

export async function getQrOfflineQueueCount(): Promise<number> {
  return (await readQueue()).length;
}

export async function enqueueQrOfflineScan(payload: string): Promise<QrOfflineItem> {
  const item: QrOfflineItem = {
    clientId: randomClientId(),
    payload: payload.trim(),
    scannedAt: new Date().toISOString(),
  };
  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);
  return item;
}

let syncInFlight: Promise<QrSyncSummary> | null = null;

export async function syncQrOfflineQueue(): Promise<QrSyncSummary> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    const queue = await readQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0, pending: 0 };
    }

    try {
      const { results } = await employeeApi.syncQrPunches(queue);
      const byId = new Map(results.map((r) => [r.clientId, r]));
      const remaining: QrOfflineItem[] = [];
      let synced = 0;
      let failed = 0;
      let lastMessage: string | undefined;
      let lastErrorCode: string | undefined;

      for (const item of queue) {
        const result = byId.get(item.clientId);
        if (!result) {
          remaining.push(item);
          continue;
        }
        if (result.ok) {
          synced += 1;
          lastMessage = result.message;
        } else if (
          result.errorCode === 'ALREADY_USED' ||
          result.errorCode === 'INVALID_OR_EXPIRED'
        ) {
          // Drop permanent failures so the queue does not stall.
          failed += 1;
          lastMessage = result.message;
          lastErrorCode = result.errorCode;
        } else {
          remaining.push(item);
          failed += 1;
          lastMessage = result.message;
          lastErrorCode = result.errorCode;
        }
      }

      await writeQueue(remaining);
      return {
        synced,
        failed,
        pending: remaining.length,
        lastMessage,
        lastErrorCode,
      };
    } catch (err) {
      return {
        synced: 0,
        failed: 0,
        pending: queue.length,
        lastMessage: err instanceof ApiError ? err.message : 'Sync hors ligne impossible',
        lastErrorCode: err instanceof ApiError && err.status === 403 ? 'FORBIDDEN' : 'ERROR',
      };
    }
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}
