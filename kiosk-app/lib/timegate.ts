import * as SecureStore from "expo-secure-store";

const API_BASE = "http://192.168.148.97:4001/api/v1";
// process.env.EXPO_PUBLIC_TIMEGATE_API_URL?.replace(/\/$/, "") ??
// "http://localhost:4001/api/v1";
const LIFETIME_TOKEN_KEY = "timegate_mobile_lifetime_token";
const DEVICE_ID_KEY = "timegate_mobile_device_id";
const DEVICE_NAME_KEY = "timegate_mobile_device_name";
const KIOSK_FEATURES_KEY = "timegate_mobile_kiosk_features";

// Feature flags
// Simple key-value store in SecureStore for experimental features.
// In production, this should come from the backend (e.g., /kiosks/:id/features).
// TODO backend: Replace this with actual feature flags from POST /auth/mobile/provision
// or a dedicated endpoint like GET /kiosks/:id/features.
const DEFAULT_FEATURES = { nfcEnabled: false };

export type KioskFeatures = {
  nfcEnabled: boolean;
};

export function getKioskFeatures(): Promise<KioskFeatures> {
  return SecureStore.getItemAsync(KIOSK_FEATURES_KEY).then((value) => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        // Merge with defaults to ensure all keys exist
        return { ...DEFAULT_FEATURES, ...parsed };
      } catch {
        // If parsing fails, return defaults
        return DEFAULT_FEATURES;
      }
    }
    return DEFAULT_FEATURES;
  });
}

export function setKioskFeatures(features: KioskFeatures): Promise<void> {
  return SecureStore.setItemAsync(KIOSK_FEATURES_KEY, JSON.stringify(features));
}

// ---------------------------------------------------------------------------
// Failure tracking
// After VERIFY_FAILURE_LIMIT consecutive failures on the SAME mode, the
// kiosk forces the user to the PIN screen and triggers a VERIFY_COOLDOWN_MS
// cooldown during which the main mode remains blocked. A success or a
// mode change resets the counter.
// ---------------------------------------------------------------------------

export type AttemptKey = "face" | "nfc" | "pin";

export const VERIFY_FAILURE_LIMIT = 3;
export const VERIFY_COOLDOWN_MS = 30_000;

let failureCount = 0;
let cooldownUntil = 0;
let lastMode: AttemptKey | null = null;

export function recordFailure(
  mode: AttemptKey,
): { locked: boolean; cooldownMsLeft: number } {
  if (lastMode !== mode) {
    failureCount = 0;
    lastMode = mode;
  }
  failureCount += 1;
  if (failureCount >= VERIFY_FAILURE_LIMIT) {
    cooldownUntil = Date.now() + VERIFY_COOLDOWN_MS;
    return { locked: true, cooldownMsLeft: VERIFY_COOLDOWN_MS };
  }
  return { locked: false, cooldownMsLeft: 0 };
}

export function recordSuccess(): void {
  failureCount = 0;
  lastMode = null;
  cooldownUntil = 0;
}

export function getCooldownState(): {
  active: boolean;
  msLeft: number;
  mode: AttemptKey | null;
} {
  const msLeft = Math.max(0, cooldownUntil - Date.now());
  return { active: msLeft > 0, msLeft, mode: lastMode };
}

export function getTimeGateApiBase(): string {
  return API_BASE;
}

function mobileLog(
  level: "log" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
) {
  if (!__DEV__) return;
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  // eslint-disable-next-line no-console
  console[level](`[TimeGateMobile] ${message}${payload}`);
}

export type VerifyFaceResult = {
  success: boolean;
  confidence: number | null;
  message: string;
  employeeName: string | null;
  offlineSync?: boolean;
  capturedAt?: string | null;
};

type VerifyFaceOptions = {
  offlineSync?: boolean;
  capturedAt?: string;
  idempotencyKey?: string;
};

export type ProvisionInput = {
  operatorToken: string;
  kioskId?: string;
  branchId: string;
  deviceName?: string;
  location?: string;
};

export type ProvisionState = {
  hasToken: boolean;
  deviceName: string | null;
};

export type TimeGateBranch = {
  id: string;
  name: string;
  address: string | null;
  timezone: string | null;
};

export type TimeGateKiosk = {
  id: string;
  name: string;
  branchId: string;
  location: string | null;
  status: "ONLINE" | "OFFLINE";
};

class MobileApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseErrorBody(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) {
    return `HTTP ${res.status}`;
  }
  try {
    const json = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(json.message)) {
      return json.message.join(", ");
    }
    if (typeof json.message === "string") {
      return json.message;
    }
  } catch {
    // Keep raw text
  }
  return text;
}

export async function bootstrapOperator(
  email: string,
  password: string,
  sku: string,
): Promise<{
  operatorToken: string;
  branches: TimeGateBranch[];
}> {
  const res = await fetch(`${API_BASE}/auth/mobile/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      sku,
    }),
  });
  if (!res.ok) {
    const message = await parseErrorBody(res);
    throw new MobileApiError(`Echec connexion API: ${message}`, res.status);
  }
  const json = (await res.json()) as {
    operator_token?: string;
    branches?: TimeGateBranch[];
  };
  if (!json.operator_token) {
    throw new Error(
      "Token opérateur manquant dans la réponse /auth/mobile/bootstrap.",
    );
  }
  const branches = Array.isArray(json.branches) ? json.branches : [];
  return {
    operatorToken: json.operator_token,
    branches,
  };
}

export async function fetchKiosksForBranch(
  operatorToken: string,
  branchId: string,
): Promise<TimeGateKiosk[]> {
  const url = `${API_BASE}/kiosks?branchId=${encodeURIComponent(branchId)}&page=1&limit=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  if (!res.ok) {
    const message = await parseErrorBody(res);
    throw new MobileApiError(
      `Impossible de charger les kiosks: ${message}`,
      res.status,
    );
  }
  const json = (await res.json()) as { data?: TimeGateKiosk[] };
  return Array.isArray(json.data) ? json.data : [];
}

async function getLifetimeToken(): Promise<string | null> {
  return SecureStore.getItemAsync(LIFETIME_TOKEN_KEY);
}

export async function clearProvisioning(): Promise<void> {
  await SecureStore.deleteItemAsync(LIFETIME_TOKEN_KEY);
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  await SecureStore.deleteItemAsync(DEVICE_NAME_KEY);
  await SecureStore.deleteItemAsync(KIOSK_FEATURES_KEY);
}

export async function getProvisionState(): Promise<ProvisionState> {
  const [token, deviceName] = await Promise.all([
    getLifetimeToken(),
    SecureStore.getItemAsync(DEVICE_NAME_KEY),
  ]);
  return { hasToken: Boolean(token), deviceName };
}

export async function provisionKiosk(
  input: ProvisionInput,
): Promise<ProvisionState> {
  const res = await fetch(`${API_BASE}/auth/mobile/provision`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.operatorToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      branchId: input.branchId.trim(),
      ...(input.kioskId?.trim() ? { kioskId: input.kioskId.trim() } : {}),
      ...(input.deviceName?.trim()
        ? { deviceName: input.deviceName.trim() }
        : {}),
      ...(input.location?.trim() ? { location: input.location.trim() } : {}),
    }),
  });
  if (!res.ok) {
    const message = await parseErrorBody(res);
    throw new MobileApiError(message, res.status);
  }
  const json = (await res.json()) as {
    lifetime_token: string;
    kiosk?: { id?: string; name?: string };
  };
  if (!json.lifetime_token) {
    throw new Error("Token lifetime manquant dans la reponse de provision.");
  }
  const deviceName = json.kiosk?.name?.trim() || null;
  const deviceId = json.kiosk?.id?.trim() || null;
  await SecureStore.setItemAsync(LIFETIME_TOKEN_KEY, json.lifetime_token);
  if (deviceId) await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  if (deviceName) await SecureStore.setItemAsync(DEVICE_NAME_KEY, deviceName);
  return { hasToken: true, deviceName };
}

/** Keeps kiosk ONLINE on dashboard while the app is open (lifetime token). */
export async function sendKioskHeartbeat(): Promise<void> {
  const token = await getLifetimeToken();
  if (!token) return;
  const res = await fetch(`${API_BASE}/auth/mobile/heartbeat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    await clearProvisioning();
    throw new MobileApiError("Session expiree. Reconfigurez l'appareil.", 401);
  }
  if (!res.ok) {
    const message = await parseErrorBody(res);
    throw new MobileApiError(message, res.status);
  }
}

/** React Native multipart upload (Blob + fetch(file://) fails on Android). */
type ReactNativeFormDataFile = {
  uri: string;
  name: string;
  type: string;
};

function toUploadablePhotoUri(photoUri: string): string {
  const trimmed = photoUri.trim();
  if (trimmed.startsWith("file://") || trimmed.startsWith("content://")) {
    return trimmed;
  }
  return `file://${trimmed}`;
}

function buildPhotoUploadPart(photoUri: string): ReactNativeFormDataFile {
  const uri = toUploadablePhotoUri(photoUri);
  const isPng = uri.toLowerCase().includes(".png");
  return {
    uri,
    name: isPng ? "capture.png" : "capture.jpg",
    type: isPng ? "image/png" : "image/jpeg",
  };
}

export function isLikelyNetworkError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  return (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("aborterror")
  );
}

export function isRetryableVerificationError(error: unknown): boolean {
  if (isLikelyNetworkError(error)) return true;
  if (error instanceof MobileApiError) {
    return error.status >= 500 || error.status === 429;
  }
  return false;
}

/**
 * Catégorise une erreur pour l'UI (couleur + ton).
 * "error"   → rouge, bloquant
 * "warn"    → orange, attention requise
 * "info"    → bleu, neutre
 * "success" → vert (rare pour une erreur, mais utilisé côté UI)
 */
export type ErrorCategory = "error" | "warn" | "info";

export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof MobileApiError) {
    if (error.status === 401) return "warn";
    if (error.status === 403) return "warn";
    if (error.status === 404) return "warn";
    if (error.status === 408) return "warn";
    if (error.status === 429) return "warn";
    if (error.status >= 500) return "error";
    return "error";
  }
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  if (isLikelyNetworkError(error)) return "warn";
  if (msg.includes("timeout") || msg.includes("verification trop longue")) {
    return "warn";
  }
  return "error";
}

export function getVerificationUserMessage(error: unknown): string {
  const raw =
    error instanceof MobileApiError || error instanceof Error
      ? (error.message ?? "")
      : String(error);
  const msg = raw.toLowerCase();

  // Engine feedback
  if (msg.includes("no face detected")) {
    return "Aucun visage détecté. Placez-vous face à la caméra, dans un endroit bien éclairé.";
  }
  if (msg.includes("multiple faces") || msg.includes("several faces")) {
    return "Plusieurs visages détectés. Une seule personne doit se présenter à la fois.";
  }
  if (
    msg.includes("face engine") ||
    msg.includes("face_recognition import failed") ||
    msg.includes("face engine timeout")
  ) {
    return "Service de reconnaissance momentanément indisponible. Patientez quelques secondes puis réessayez.";
  }

  // Timing
  if (msg.includes("timeout") || msg.includes("verification trop longue")) {
    return "Vérification trop longue. Vérifiez votre connexion réseau puis réessayez.";
  }

  // Network
  if (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch")
  ) {
    return "Impossible de joindre le serveur. Vérifiez le réseau et l'adresse de l'API.";
  }

  // Auth/provisioning
  if (msg.includes("non provisionne") || msg.includes("missing bearer")) {
    return "Appareil non configuré. Reconfigurez l'application.";
  }
  if (error instanceof MobileApiError) {
    if (error.status === 401) {
      return "Session expirée. Reconfigurez l'appareil pour continuer.";
    }
    if (error.status === 403) {
      return "Accès refusé. Vérifiez les droits de cet appareil auprès de votre administrateur.";
    }
    if (error.status === 404) {
      return "Ressource introuvable. Réessayez ou reconfigurez l'appareil.";
    }
    if (error.status === 429) {
      return "Trop de tentatives. Patientez quelques secondes avant de réessayer.";
    }
    if (error.status >= 500) {
      return "Service temporairement indisponible. Réessayez dans quelques instants.";
    }
  }

  if (raw.trim()) {
    // Nettoyage léger : si le backend renvoie un message technique anglais,
    // on l'enveloppe pour qu'il reste lisible côté UX.
    const trimmed = raw.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return "Vérification échouée. Veuillez réessayer.";
}

export function createMobileIdempotencyKey(prefix = "verify"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function verifyFacePhoto(
  photoUri: string,
  timeoutMs = 60000,
  options?: VerifyFaceOptions,
): Promise<VerifyFaceResult> {
  const startedAt = Date.now();
  mobileLog("log", "verifyFacePhoto started", { timeoutMs, apiBase: API_BASE });
  const token = await getLifetimeToken();
  if (!token) {
    mobileLog("warn", "verifyFacePhoto aborted: no lifetime token");
    throw new Error(
      "Appareil non provisionné. Configurez l'app au premier lancement.",
    );
  }
  const photoPart = buildPhotoUploadPart(photoUri);
  mobileLog("log", "verifyFacePhoto payload", {
    uri: photoPart.uri,
    multipartName: photoPart.name,
    mime: photoPart.type,
  });
  const formData = new FormData();
  formData.append("photo", photoPart as unknown as Blob);
  if (options?.offlineSync) {
    formData.append("offlineSync", "1");
  }
  if (options?.capturedAt) {
    formData.append("capturedAt", options.capturedAt);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/mobile/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options?.idempotencyKey
          ? { "X-Idempotency-Key": options.idempotencyKey }
          : {}),
      },
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      mobileLog("error", "verifyFacePhoto timeout", {
        elapsedMs: Date.now() - startedAt,
      });
      throw new Error(
        "Vérification trop longue (délai dépassé). Vérifiez la connexion réseau et l'API.",
      );
    }
    mobileLog("error", "verifyFacePhoto fetch failed", {
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 401) await clearProvisioning();

  if (!res.ok) {
    const message = await parseErrorBody(res);
    const userMessage = getVerificationUserMessage(
      new MobileApiError(message, res.status),
    );
    mobileLog("warn", "verifyFacePhoto API error", {
      status: res.status,
      elapsedMs: Date.now() - startedAt,
      message,
      userMessage,
    });
    throw new MobileApiError(userMessage, res.status);
  }

  const json = (await res.json()) as {
    success: boolean;
    confidence?: number | null;
    message?: string;
    offlineSync?: boolean;
    capturedAt?: string | null;
    employee?: { firstName?: string; lastName?: string };
  };
  const employeeName =
    `${json.employee?.firstName ?? ""} ${json.employee?.lastName ?? ""}`.trim() ||
    null;
  const apiMessage = typeof json.message === "string" ? json.message : null;

  const result = {
    success: Boolean(json.success),
    confidence: typeof json.confidence === "number" ? json.confidence : null,
    employeeName,
    offlineSync: Boolean(json.offlineSync),
    capturedAt: typeof json.capturedAt === "string" ? json.capturedAt : null,
    message:
      apiMessage ??
      (json.success
        ? employeeName
          ? `Bienvenue ${employeeName}`
          : "Bienvenue"
        : "Visage non reconnu. Merci de réessayer."),
  };

  mobileLog("log", "verifyFacePhoto completed", {
    success: result.success,
    confidence: result.confidence,
    requestId: res.headers.get("x-request-id"),
    elapsedMs: Date.now() - startedAt,
  });
  return result;
}

export async function verifyMobilePin(
  employeeId: string,
  pin: string,
  options?: { idempotencyKey?: string },
): Promise<VerifyFaceResult> {
  const token = await getLifetimeToken();
  if (!token) {
    throw new Error(
      "Appareil non provisionné. Configurez l'app au premier lancement.",
    );
  }
  const res = await fetch(`${API_BASE}/auth/mobile/verify-pin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options?.idempotencyKey
        ? { "X-Idempotency-Key": options.idempotencyKey }
        : {}),
    },
    body: JSON.stringify({ employeeId: employeeId.trim(), pin }),
  });
  if (res.status === 401) await clearProvisioning();
  if (!res.ok) {
    const message = await parseErrorBody(res);
    throw new MobileApiError(
      getVerificationUserMessage(new MobileApiError(message, res.status)),
      res.status,
    );
  }
  const json = (await res.json()) as {
    success: boolean;
    confidence?: number | null;
    message?: string;
    employee?: { firstName?: string; lastName?: string };
  };
  const employeeName =
    `${json.employee?.firstName ?? ""} ${json.employee?.lastName ?? ""}`.trim() ||
    null;
  return {
    success: Boolean(json.success),
    confidence: typeof json.confidence === "number" ? json.confidence : null,
    employeeName,
    offlineSync: false,
    capturedAt: null,
    message:
      json.message ??
      (json.success
        ? employeeName
          ? `Bienvenue ${employeeName}`
          : "Pointage enregistré"
        : "Identifiant ou PIN incorrect. Réessayez."),
  };
}

// ---------------------------------------------------------------------------
// NFC badge verification
// ---------------------------------------------------------------------------

export type NfcVerifyResult = {
  success: boolean;
  badgeUid: string;
  message: string;
  employeeName: string | null;
};

type NfcVerifyOptions = {
  idempotencyKey?: string;
};

/**
 * Stub backend call. Resolves with a successful verify result for any UID
 * of length >= 4. The real endpoint will be POST /kiosk/verify-nfc.
 *
 * Throws on:
 *  - missing lifetime token (kiosk not provisioned)
 *  - HTTP / network errors wrapped in MobileApiError (re-using the existing
 *    classifier + user-message helpers)
 */
export async function verifyNfcBadge(
  badgeUid: string,
  options?: NfcVerifyOptions,
): Promise<NfcVerifyResult> {
  const token = await getLifetimeToken();
  if (!token) {
    throw new Error(
      "Appareil non provisionné. Configurez l'app au premier lancement.",
    );
  }
  // TODO backend: branch on POST /kiosk/verify-nfc as soon as the endpoint
  // exists. Stub below — simulate a 800ms network call and accept any UID
  // whose length is at least 4 characters.
  mobileLog("log", "verifyNfcBadge started (stub)", { badgeUid });
  await new Promise((r) => setTimeout(r, 800));
  if (badgeUid.trim().length < 4) {
    throw new MobileApiError(
      "Identifiant de badge trop court. Réessayez.",
      400,
    );
  }
  return {
    success: true,
    badgeUid: badgeUid.trim(),
    message: "Pointage enregistré",
    employeeName: null,
  };
}

/**
 * Hardware stub for reading a single NFC badge UID.
 *
 * Real implementation will live behind `readNfcBadge` once a native module
 * is wired in (expo-nfc-pe, @react-native-community/nfc, or a custom
 * module). The contract is:
 *
 *   - resolves with the badge UID (hex string)
 *   - rejects with MobileApiError:
 *       - "NFC_TIMEOUT"    (no badge presented within timeoutMs)
 *       - "NFC_CANCELLED"  (user cancelled)
 *       - "NFC_DISABLED"   (NFC radio off)
 */
export async function readNfcBadge(timeoutMs = 10_000): Promise<string> {
  // TODO hardware: replace with a call to the chosen NFC lib.
  mobileLog("log", "readNfcBadge started (stub)", { timeoutMs });
  await new Promise((r) => setTimeout(r, Math.max(500, timeoutMs * 0.6)));
  const uid = `STUB-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
  mobileLog("log", "readNfcBadge read", { uid });
  return uid;
}
