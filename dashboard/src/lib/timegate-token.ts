const STORAGE_KEY = "timegate_token";
const COOKIE_KEY = "timegate_token";

export function getTimeGateToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setTimeGateToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function clearTimeGateToken() {
  localStorage.removeItem(STORAGE_KEY);
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
}
