import { cookies } from "next/headers";

export function getTimeGateApiBaseServer(): string {
  return (
    process.env.NEXT_PUBLIC_TIMEGATE_API_URL?.replace(/\/$/, "") ??
    "http://localhost:4000/api"
  );
}

export async function timegateServerFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get("timegate_token")?.value ?? null;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${getTimeGateApiBaseServer()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* plain text */
  }

  if (!res.ok) {
    throw new Error(typeof data === "string" ? data : `HTTP ${res.status}`);
  }
  return data as T;
}
