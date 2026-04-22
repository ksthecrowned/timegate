"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { getTimeGateApiBase, timegateFetch } from "@/lib/timegate-api";
import {
  clearTimeGateToken,
  getTimeGateToken,
  setTimeGateToken,
} from "@/lib/timegate-token";
import type { TimeGateRole } from "@/types/timegate";

type TokenPayload = {
  role?: TimeGateRole;
  organizationId?: string | null;
};

function decodeJwtPayload(token: string | null): TokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const json = atob(normalized + pad);
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

type AuthContextValue = {
  token: string | null;
  role: TimeGateRole | null;
  organizationId: string | null;
  isReady: boolean;
  login: (email: string, password: string, sku?: string) => Promise<void>;
  logout: () => void;
  apiBase: string;
};

const TimeGateAuthContext = createContext<AuthContextValue | null>(null);

export function TimeGateAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<TimeGateRole | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  React.useEffect(() => {
    const t = getTimeGateToken();
    const payload = decodeJwtPayload(t);
    setToken(t);
    setRole(payload?.role ?? null);
    setOrganizationId(payload?.organizationId ?? null);
    setIsReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string, sku?: string) => {
    const data = await timegateFetch<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, ...(sku ? { sku } : {}) }),
    });
    const payload = decodeJwtPayload(data.access_token);
    setTimeGateToken(data.access_token);
    setToken(data.access_token);
    setRole(payload?.role ?? null);
    setOrganizationId(payload?.organizationId ?? null);
  }, []);

  const logout = useCallback(() => {
    clearTimeGateToken();
    setToken(null);
    setRole(null);
    setOrganizationId(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      role,
      organizationId,
      isReady,
      login,
      logout,
      apiBase: getTimeGateApiBase(),
    }),
    [token, role, organizationId, isReady, login, logout]
  );

  return (
    <TimeGateAuthContext.Provider value={value}>
      {children}
    </TimeGateAuthContext.Provider>
  );
}

export function useTimeGateAuth() {
  const ctx = useContext(TimeGateAuthContext);
  if (!ctx) {
    throw new Error("useTimeGateAuth must be used within TimeGateAuthProvider");
  }
  return ctx;
}
