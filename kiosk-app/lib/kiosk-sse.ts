import { DeviceEventEmitter } from "react-native";
import { API_BASE, clearProvisioning, getLifetimeToken } from "./timegate";

export const KIOSK_SESSION_CHANGED = "kiosk:session_changed";
export const KIOSK_ACCESS_REVOKED = "kiosk:access_revoked";

type SseHandlers = {
  onAccessRevoked: (reason: string) => void;
};

type ParsedSse = {
  type: string;
  data: Record<string, unknown>;
};

function parseSseBlock(block: string): ParsedSse | null {
  let type = "message";
  const dataLines: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      type = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return null;
  const raw = dataLines.join("\n");
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return { type, data };
  } catch {
    return { type, data: { raw } };
  }
}

/**
 * SSE client via XMLHttpRequest (Authorization header; RN has no reliable EventSource).
 * Returns a stop function.
 */
export function startKioskEventStream(handlers: SseHandlers): () => void {
  let stopped = false;
  let xhr: XMLHttpRequest | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let retryMs = 2_000;
  let buffer = "";
  let processed = 0;

  const cleanupXhr = () => {
    if (!xhr) return;
    xhr.onprogress = null;
    xhr.onloadend = null;
    xhr.onerror = null;
    xhr.abort();
    xhr = null;
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, retryMs);
    retryMs = Math.min(Math.round(retryMs * 1.5), 30_000);
  };

  const handleBlock = (block: string) => {
    const event = parseSseBlock(block);
    if (!event) return;
    if (event.type === "access_revoked") {
      const reason =
        typeof event.data.reason === "string" ? event.data.reason : "revoked";
      handlers.onAccessRevoked(reason);
    }
  };

  const connect = async () => {
    if (stopped) return;
    const token = await getLifetimeToken();
    if (!token) return;

    cleanupXhr();
    buffer = "";
    processed = 0;

    const request = new XMLHttpRequest();
    xhr = request;
    request.open("GET", `${API_BASE}/auth/mobile/events`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.setRequestHeader("Accept", "text/event-stream");
    request.setRequestHeader("Cache-Control", "no-cache");

    request.onprogress = () => {
      const chunk = request.responseText.slice(processed);
      processed = request.responseText.length;
      if (!chunk) return;
      buffer += chunk;
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        handleBlock(part);
      }
    };

    request.onloadend = () => {
      if (stopped) return;
      // Auth failure — do not hammer reconnect with a dead token.
      if (request.status === 401 || request.status === 403) {
        handlers.onAccessRevoked("unauthorized");
        return;
      }
      scheduleReconnect();
    };

    request.onerror = () => {
      if (stopped) return;
      scheduleReconnect();
    };

    request.send();
  };

  void connect();

  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    cleanupXhr();
  };
}

export async function forceKioskLogout(reason = "revoked"): Promise<void> {
  await clearProvisioning();
  DeviceEventEmitter.emit(KIOSK_ACCESS_REVOKED, { reason });
  DeviceEventEmitter.emit(KIOSK_SESSION_CHANGED, { provisioned: false, reason });
}

export function emitKioskSessionChanged(provisioned: boolean): void {
  DeviceEventEmitter.emit(KIOSK_SESSION_CHANGED, { provisioned });
}
