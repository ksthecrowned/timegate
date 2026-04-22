import * as SecureStore from "expo-secure-store";

const API_BASE = process.env.EXPO_PUBLIC_TIMEGATE_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000/api";
const LIFETIME_TOKEN_KEY = "timegate_mobile_lifetime_token";
const DEVICE_NAME_KEY = "timegate_mobile_device_name";

function mobileLog(level: "log" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
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
};

export type ProvisionInput = {
  operatorToken: string;
  deviceId?: string;
  siteId: string;
  deviceName?: string;
  location?: string;
};

export type ProvisionState = {
  hasToken: boolean;
  deviceName: string | null;
};

export type TimeGateSite = {
  id: string;
  name: string;
  address: string | null;
  timezone: string | null;
};

export type TimeGateDevice = {
  id: string;
  name: string;
  siteId: string;
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

export async function bootstrapOperator(email: string, password: string, sku: string): Promise<{
  operatorToken: string;
  sites: TimeGateSite[];
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
    console.error(res);
    const message = await parseErrorBody(res);
    throw new MobileApiError(`Echec connexion API: ${message}`, res.status);
  }
  const json = (await res.json()) as {
    operator_token?: string;
    sites?: TimeGateSite[];
  };
  if (!json.operator_token) {
    throw new Error("Token opérateur manquant dans la réponse /auth/mobile/bootstrap.");
  }
  return {
    operatorToken: json.operator_token,
    sites: Array.isArray(json.sites) ? json.sites : [],
  };
}

export async function fetchDevicesForSite(operatorToken: string, siteId: string): Promise<TimeGateDevice[]> {
  const url = `${API_BASE}/devices?siteId=${encodeURIComponent(siteId)}&page=1&limit=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  if (!res.ok) {
    const message = await parseErrorBody(res);
    throw new MobileApiError(`Impossible de charger les appareils: ${message}`, res.status);
  }
  const json = (await res.json()) as { data?: TimeGateDevice[] };
  return Array.isArray(json.data) ? json.data : [];
}

async function getLifetimeToken(): Promise<string | null> {
  return SecureStore.getItemAsync(LIFETIME_TOKEN_KEY);
}

export async function clearProvisioning(): Promise<void> {
  await SecureStore.deleteItemAsync(LIFETIME_TOKEN_KEY);
  await SecureStore.deleteItemAsync(DEVICE_NAME_KEY);
}

export async function getProvisionState(): Promise<ProvisionState> {
  const [token, deviceName] = await Promise.all([
    getLifetimeToken(),
    SecureStore.getItemAsync(DEVICE_NAME_KEY),
  ]);
  return { hasToken: Boolean(token), deviceName };
}

export async function provisionKiosk(input: ProvisionInput): Promise<ProvisionState> {
  const res = await fetch(`${API_BASE}/auth/mobile/provision`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.operatorToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      siteId: input.siteId.trim(),
      ...(input.deviceId?.trim() ? { deviceId: input.deviceId.trim() } : {}),
      ...(input.deviceName?.trim() ? { deviceName: input.deviceName.trim() } : {}),
      ...(input.location?.trim() ? { location: input.location.trim() } : {}),
    }),
  });
  if (!res.ok) {
    const message = await parseErrorBody(res);
    throw new MobileApiError(message, res.status);
  }
  const json = (await res.json()) as {
    lifetime_token: string;
    device?: { name?: string };
  };
  if (!json.lifetime_token) {
    throw new Error("Token lifetime manquant dans la reponse de provision.");
  }
  const deviceName = json.device?.name?.trim() || null;
  await SecureStore.setItemAsync(LIFETIME_TOKEN_KEY, json.lifetime_token);
  if (deviceName) await SecureStore.setItemAsync(DEVICE_NAME_KEY, deviceName);
  return { hasToken: true, deviceName };
}

export async function verifyFacePhoto(
  photoUri: string,
  timeoutMs = 20000,
): Promise<VerifyFaceResult> {
  const startedAt = Date.now();
  mobileLog("log", "verifyFacePhoto started", { timeoutMs, apiBase: API_BASE });
  const token = await getLifetimeToken();
  if (!token) {
    mobileLog("warn", "verifyFacePhoto aborted: no lifetime token");
    throw new Error("Appareil non provisionne. Configurez l'app au premier lancement.");
  }
  const formData = new FormData();
  formData.append("photo", {
    uri: photoUri,
    name: "capture.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/mobile/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      mobileLog("error", "verifyFacePhoto timeout", { elapsedMs: Date.now() - startedAt });
      throw new Error(
        "Verification trop longue (timeout). Verifiez la connexion reseau et le service API.",
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
    mobileLog("warn", "verifyFacePhoto API error", {
      status: res.status,
      elapsedMs: Date.now() - startedAt,
      message,
    });
    throw new MobileApiError(message, res.status);
  }

  const json = (await res.json()) as {
    success: boolean;
    confidence?: number | null;
    message?: string;
    employee?: { firstName?: string; lastName?: string };
  };
  const employeeName = `${json.employee?.firstName ?? ""} ${json.employee?.lastName ?? ""}`.trim() || null;
  const apiMessage = typeof json.message === "string" ? json.message : null;

  const result = {
    success: Boolean(json.success),
    confidence: typeof json.confidence === "number" ? json.confidence : null,
    employeeName,
    message:
      apiMessage ??
      (json.success
        ? employeeName
          ? `Bienvenue ${employeeName}`
          : "Bienvenue"
        : "Visage non reconnu. Merci de reessayer."),
  };

  mobileLog("log", "verifyFacePhoto completed", {
    success: result.success,
    confidence: result.confidence,
    elapsedMs: Date.now() - startedAt,
  });
  return result;
}
