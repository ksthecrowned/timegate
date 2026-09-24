import * as SecureStore from 'expo-secure-store';

import { ApiError, employeeApi } from './api';

export { isNetworkishError } from './networkError';

const QUEUE_KEY = 'timegate_qr_offline_queue_v2';
const ACK_KEY = 'timegate_qr_offline_acks_v1';
const MAX_QUEUE = 100;
const MAX_ATTEMPTS = 25;
const SYNC_BATCH = 50;

export type QrOfflineItem = {
  clientId: string;
  payload: string;
  scannedAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastErrorCode?: string;
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

function payloadFingerprint(payload: string): string {
  // Lightweight stable key without crypto module (RN-friendly).
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (h * 31 + payload.charCodeAt(i)) | 0;
  }
  return `p${h}_${payload.length}`;
}

async function readQueue(): Promise<QrOfflineItem[]> {
  const raw = await SecureStore.getItemAsync(QUEUE_KEY);
  if (!raw) {
    // migrate v1 key if present
    const legacy = await SecureStore.getItemAsync('timegate_qr_offline_queue');
    if (!legacy) return [];
    try {
      const parsed = JSON.parse(legacy) as Array<Partial<QrOfflineItem>>;
      const migrated = (Array.isArray(parsed) ? parsed : [])
        .filter((item) => item?.clientId && item?.payload && item?.scannedAt)
        .map((item) => ({
          clientId: String(item.clientId),
          payload: String(item.payload),
          scannedAt: String(item.scannedAt),
          attempts: Number(item.attempts ?? 0),
          lastAttemptAt: item.lastAttemptAt,
          lastErrorCode: item.lastErrorCode,
        }));
      await writeQueue(migrated);
      await SecureStore.deleteItemAsync('timegate_qr_offline_queue');
      return migrated;
    } catch {
      return [];
    }
  }
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
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
}

async function readAcks(): Promise<Record<string, string>> {
  const raw = await SecureStore.getItemAsync(ACK_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAck(clientId: string, challengeId: string): Promise<void> {
  const acks = await readAcks();
  acks[clientId] = challengeId;
  const keys = Object.keys(acks);
  if (keys.length > 200) {
    for (const key of keys.slice(0, keys.length - 200)) {
      delete acks[key];
    }
  }
  await SecureStore.setItemAsync(ACK_KEY, JSON.stringify(acks));
}

export async function getQrOfflineQueueCount(): Promise<number> {
  return (await readQueue()).length;
}

export async function listQrOfflineQueue(): Promise<QrOfflineItem[]> {
  return readQueue();
}

export async function enqueueQrOfflineScan(payload: string): Promise<QrOfflineItem> {
  const trimmed = payload.trim();
  const queue = await readQueue();
  const fingerprint = payloadFingerprint(trimmed);
  const existing = queue.find(
    (item) => payloadFingerprint(item.payload) === fingerprint,
  );
  if (existing) {
    return existing;
  }

  const item: QrOfflineItem = {
    clientId: randomClientId(),
    payload: trimmed,
    scannedAt: new Date().toISOString(),
    attempts: 0,
  };
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

    const batch = [...queue]
      .sort((a, b) => a.scannedAt.localeCompare(b.scannedAt))
      .slice(0, SYNC_BATCH);

    try {
      const { results } = await employeeApi.syncQrPunches(
        batch.map(({ clientId, payload, scannedAt }) => ({
          clientId,
          payload,
          scannedAt,
        })),
      );
      const byId = new Map(results.map((r) => [r.clientId, r]));
      const remaining: QrOfflineItem[] = [];
      let synced = 0;
      let failed = 0;
      let lastMessage: string | undefined;
      let lastErrorCode: string | undefined;
      const nowIso = new Date().toISOString();

      for (const item of queue) {
        const inBatch = batch.some((b) => b.clientId === item.clientId);
        if (!inBatch) {
          remaining.push(item);
          continue;
        }
        const result = byId.get(item.clientId);
        if (!result) {
          remaining.push({
            ...item,
            attempts: item.attempts + 1,
            lastAttemptAt: nowIso,
          });
          continue;
        }
        if (result.ok) {
          synced += 1;
          lastMessage = result.message;
          if (result.challengeId) {
            await writeAck(item.clientId, result.challengeId);
          }
          continue;
        }
        if (
          result.errorCode === 'ALREADY_USED' ||
          result.errorCode === 'INVALID_OR_EXPIRED' ||
          result.errorCode === 'INVALID_SCANNED_AT'
        ) {
          failed += 1;
          lastMessage = result.message;
          lastErrorCode = result.errorCode;
          continue;
        }

        const attempts = item.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          failed += 1;
          lastMessage = result.message ?? 'Trop de tentatives — pointage abandonné';
          lastErrorCode = result.errorCode ?? 'MAX_ATTEMPTS';
          continue;
        }

        remaining.push({
          ...item,
          attempts,
          lastAttemptAt: nowIso,
          lastErrorCode: result.errorCode,
        });
        failed += 1;
        lastMessage = result.message;
        lastErrorCode = result.errorCode;
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
      const nowIso = new Date().toISOString();
      const bumped = queue.map((item) =>
        batch.some((b) => b.clientId === item.clientId)
          ? { ...item, attempts: item.attempts + 1, lastAttemptAt: nowIso }
          : item,
      );
      await writeQueue(bumped);
      return {
        synced: 0,
        failed: 0,
        pending: bumped.length,
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
