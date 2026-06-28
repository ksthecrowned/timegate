import * as FileSystem from "expo-file-system/legacy";
import {
  verifyFacePhoto,
  verifyNfcBadge,
  verifyQrCode,
  isRetryableVerificationError,
} from "./timegate";

/**
 * Offline verify queue.
 *
 * Three kinds of items are supported:
 *  - "face"  → a captured photo on disk, retried via verifyFacePhoto
 *  - "nfc"   → a badge UID string, retried via verifyNfcBadge
 *  - "qr"    → a QR payload string, retried via verifyQrCode
 *
 * Items are persisted in a single JSON file so the queue survives app
 * restarts. Old items persisted before the `kind` field was added are
 * treated as "face" by default.
 */
type PendingVerifyItem = {
  id: string;
  kind: "face" | "nfc" | "qr";
  photoPath?: string;
  badgeUid?: string;
  qrPayload?: string;
  capturedAt: string;
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
    if (!Array.isArray(parsed)) return [];
    // Backwards-compat: items without `kind` are treated as face.
    return parsed.map((item) => ({
      ...item,
      kind: (item.kind ?? "face") as PendingVerifyItem["kind"],
    }));
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

/**
 * Enqueue a face verification. Copies the photo into the persistent photos
 * directory so it survives app restarts.
 */
export async function enqueueOfflineFaceVerification(
  photoUri: string,
): Promise<number> {
  await ensurePhotosDir();
  const id = makeId();
  const photoPath = `${PHOTOS_DIR}/${id}.jpg`;
  await FileSystem.copyAsync({ from: photoUri, to: photoPath });

  const queue = await readQueue();
  queue.push({
    id,
    kind: "face",
    photoPath,
    capturedAt: new Date().toISOString(),
    attempts: 0,
  });
  await writeQueue(queue);
  return queue.length;
}

/**
 * Enqueue an NFC badge verification. No file is copied — the UID is the
 * only payload.
 */
export async function enqueueOfflineNfcVerification(
  badgeUid: string,
): Promise<number> {
  const queue = await readQueue();
  queue.push({
    id: makeId(),
    kind: "nfc",
    badgeUid: badgeUid.trim(),
    capturedAt: new Date().toISOString(),
    attempts: 0,
  });
  await writeQueue(queue);
  return queue.length;
}

export async function enqueueOfflineQrVerification(
  qrPayload: string,
): Promise<number> {
  const queue = await readQueue();
  queue.push({
    id: makeId(),
    kind: "qr",
    qrPayload: qrPayload.trim(),
    capturedAt: new Date().toISOString(),
    attempts: 0,
  });
  await writeQueue(queue);
  return queue.length;
}

/**
 * Backwards-compat alias. The screen kept calling
 * `enqueueOfflineVerification` before the queue learned about NFC.
 */
export async function enqueueOfflineVerification(
  photoUri: string,
): Promise<number> {
  return enqueueOfflineFaceVerification(photoUri);
}

async function syncOne(
  item: PendingVerifyItem,
  timeoutMs: number,
): Promise<"ok" | "retry" | "drop"> {
  try {
    if (item.kind === "nfc") {
      if (!item.badgeUid) {
        return "drop";
      }
      await verifyNfcBadge(item.badgeUid, {
        idempotencyKey: item.id,
        offlineSync: true,
        capturedAt: item.capturedAt,
      });
    } else if (item.kind === "qr") {
      if (!item.qrPayload) {
        return "drop";
      }
      await verifyQrCode(item.qrPayload, {
        idempotencyKey: item.id,
        offlineSync: true,
        capturedAt: item.capturedAt,
      });
    } else {
      if (!item.photoPath) {
        return "drop";
      }
      await verifyFacePhoto(item.photoPath, timeoutMs, {
        offlineSync: true,
        capturedAt: item.capturedAt,
        idempotencyKey: item.id,
      });
    }
    return "ok";
  } catch (error) {
    if (isRetryableVerificationError(error)) {
      return "retry";
    }
    return "drop";
  }
}

async function cleanupItem(item: PendingVerifyItem): Promise<void> {
  if (item.kind === "face" && item.photoPath) {
    try {
      await FileSystem.deleteAsync(item.photoPath, { idempotent: true });
    } catch {
      // Ignore cleanup errors — the queue entry is already settled.
    }
  }
}

async function syncOfflineVerificationsOnce(
  timeoutMs: number,
): Promise<{ synced: number; pending: number }> {
  const queue = await readQueue();
  if (!queue.length) return { synced: 0, pending: 0 };

  let synced = 0;
  const remaining: PendingVerifyItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const verdict = await syncOne(item, timeoutMs);
    if (verdict === "ok") {
      synced += 1;
      await cleanupItem(item);
    } else if (verdict === "retry") {
      remaining.push({
        ...item,
        attempts: item.attempts + 1,
      });
      // Push the rest of the queue unchanged but bump their retry count
      // (mirrors the previous behaviour: server is busy, come back later).
      for (let j = i + 1; j < queue.length; j++) {
        remaining.push({
          ...queue[j],
          attempts: queue[j].attempts + 1,
          lastError: "Sync interrupted (server busy or connectivity)",
        });
      }
      break;
    } else {
      // Non-retryable: drop. The captured photo / UID is discarded.
      await cleanupItem(item);
    }
  }

  await writeQueue(remaining);
  return { synced, pending: remaining.length };
}

export async function syncOfflineVerifications(
  timeoutMs = 60_000,
): Promise<{ synced: number; pending: number }> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = syncOfflineVerificationsOnce(timeoutMs).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}
