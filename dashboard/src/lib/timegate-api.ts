import { clearTimeGateToken, getTimeGateToken } from "./timegate-token";

export function getTimeGateApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_TIMEGATE_API_URL?.replace(/\/$/, "") ??
    "http://localhost:4000/api"
  );
}

export class TimeGateApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(body || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function timegateFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getTimeGateToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${getTimeGateApiBase()}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    clearTimeGateToken();
    if (typeof window !== "undefined" && window.location.pathname !== "/signin") {
      window.location.replace("/signin");
    }
  }

  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* plain text */
  }

  if (!res.ok) {
    throw new TimeGateApiError(res.status, typeof data === "string" ? data : text);
  }

  return data as T;
}
