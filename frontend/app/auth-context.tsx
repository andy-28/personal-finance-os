"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthResponse, ProblemDetails, UserDto } from "@/lib/api-client";
import { problemMessage } from "@/lib/api-client";

type AuthContextValue = {
  user: UserDto | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  async function readProblem(response: Response) {
    return await response.json().catch(() => ({ title: "Request failed", status: response.status } satisfies ProblemDetails));
  }

  function isRetryableAuthProblem(response: Response, problem: ProblemDetails) {
    return problem.retryable === true || response.status === 408 || response.status === 502 || response.status === 503 || response.status === 504;
  }

  async function handleAuthResponse(response: Response) {
    const data = await readProblem(response);
    if (!response.ok) throw new Error(problemMessage(data));
    const auth = data as AuthResponse;
    setUser(auth.user);
    setAccessToken(auth.accessToken);
    return auth.accessToken;
  }

  async function login(email: string, password: string) {
    refreshPromiseRef.current = null;
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    await handleAuthResponse(response);
  }

  async function register(displayName: string, email: string, password: string) {
    refreshPromiseRef.current = null;
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, email, password }) });
    await handleAuthResponse(response);
  }

  async function refreshSession() {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        if (!response.ok) {
          const problem = await readProblem(response);
          if (!isRetryableAuthProblem(response, problem)) {
            setUser(null);
            setAccessToken(null);
          }
          return null;
        }
        return handleAuthResponse(response);
      } catch {
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }

  async function logout() {
    refreshPromiseRef.current = null;
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setAccessToken(null);
  }

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, []);

  const value = useMemo(() => ({ user, accessToken, isLoading, login, register, logout, refreshSession }), [user, accessToken, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
