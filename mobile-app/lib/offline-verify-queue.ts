import * as FileSystem from "expo-file-system/legacy";
import { verifyFacePhoto, isRetryableVerificationError } from "./timegate";

type PendingVerifyItem = {
  id: string;
  photoPath: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

const QUEUE_FILE = `${FileSystem.documentDirectory}timegate-offline-verify-queue.json`;
const PHOTOS_DIR = `${FileSystem.documentDirectory}offline-verify-photos`;

let syncInFlight: Promise<{ synced: number; pending: number }> | null = null;

async function ensurePhotosDir() {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

async function readQueue(): Promise<PendingVerifyItem[]> {
  const info = await FileSystem.getInfoAsync(QUEUE_FILE);
  if (!info.exists) return [];
  try {
    const raw = await FileSystem.readAsStringAsync(QUEUE_FILE);
    const parsed = JSON.parse(raw) as PendingVerifyItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: PendingVerifyItem[]) {
  await FileSystem.writeAsStringAsync(QUEUE_FILE, JSON.stringify(items));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getPendingVerifyCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

export async function enqueueOfflineVerification(photoUri: string): Promise<number> {
  await ensurePhotosDir();
  const id = makeId();
  const photoPath = `${PHOTOS_DIR}/${id}.jpg`;
  await FileSystem.copyAsync({ from: photoUri, to: photoPath });

  const queue = await readQueue();
  queue.push({
    id,
    photoPath,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  await writeQueue(queue);
  return queue.length;
}

async function syncOfflineVerificationsOnce(
  timeoutMs: number,
): Promise<{ synced: number; pending: number }> {
  const queue = await readQueue();
  if (!queue.length) return { synced: 0, pending: 0 };

  let synced = 0;
  const remaining: PendingVerifyItem[] = [];

  for (const item of queue) {
    try {
      await verifyFacePhoto(item.photoPath, timeoutMs, {
        offlineSync: true,
        capturedAt: item.createdAt,
        idempotencyKey: item.id,
      });
      synced += 1;
      try {
        await FileSystem.deleteAsync(item.photoPath, { idempotent: true });
      } catch {
        // Ignore cleanup errors, queue entry is already synced.
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isRetryableVerificationError(error)) {
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
          lastError: message,
        });
        const index = queue.indexOf(item);
        if (index >= 0) {
          remaining.push(
            ...queue.slice(index + 1).map((q) => ({
              ...q,
              attempts: q.attempts + 1,
              lastError: "Sync interrupted (server busy or connectivity)",
            })),
          );
        }
        break;
      }

      // Non-retryable API error (no face, not matched, etc.): drop from queue.
      try {
        await FileSystem.deleteAsync(item.photoPath, { idempotent: true });
      } catch {
        // Ignore cleanup errors.
      }
    }
  }

  await writeQueue(remaining);
  return { synced, pending: remaining.length };
}

export async function syncOfflineVerifications(timeoutMs = 60000): Promise<{ synced: number; pending: number }> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = syncOfflineVerificationsOnce(timeoutMs).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

