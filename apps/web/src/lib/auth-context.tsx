import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LoginResponse, Role } from "@petrus/shared";
import { apiFetch, clearStoredTokens, getStoredTokens, setStoredTokens } from "./api-client";

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  papel: Role;
  totpEnabled: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, senha: string) => Promise<LoginResponse>;
  loginComTotp: (loginChallengeToken: string, codigoTotp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  const carregarUsuarioAtual = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens) {
      setStatus("unauthenticated");
      return;
    }
    try {
      const me = await apiFetch<AuthUser>("/auth/me");
      setUser(me);
      setStatus("authenticated");
    } catch {
      clearStoredTokens();
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    carregarUsuarioAtual();
  }, [carregarUsuarioAtual]);

  const login = useCallback(async (email: string, senha: string) => {
    const result = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
      skipAuth: true,
    });
    if (result.status === "OK") {
      setStoredTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      setUser(result.usuario);
      setStatus("authenticated");
    }
    return result;
  }, []);

  const loginComTotp = useCallback(async (loginChallengeToken: string, codigoTotp: string) => {
    const result = await apiFetch<Extract<LoginResponse, { status: "OK" }>>("/auth/login/2fa", {
      method: "POST",
      body: JSON.stringify({ loginChallengeToken, codigoTotp }),
      skipAuth: true,
    });
    setStoredTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    setUser(result.usuario);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const tokens = getStoredTokens();
    if (tokens) {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        skipAuth: true,
      }).catch(() => undefined);
    }
    clearStoredTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ user, status, login, loginComTotp, logout }),
    [user, status, login, loginComTotp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
