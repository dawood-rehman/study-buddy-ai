"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { signOut as nextAuthSignOut } from "next-auth/react";

export type StudyBuddyUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role: "admin" | "user";
  subscriptionPlan: "free" | "standard" | "advanced";
  subscriptionStatus: "active" | "inactive" | "past_due" | "cancelled" | "pending";
  subscriptionLabel: string;
  subscriptionExpiresAt?: string;
  aiQuotaLimit?: number;
  aiDisabled?: boolean;
  aiCooldownUntil?: string;
};

type AuthContextValue = {
  user: StudyBuddyUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (input: { name: string; email: string }) => Promise<void>;
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
  refreshSession: () => Promise<void>;
};

type ApiErrorPayload = {
  error?: string | {
    message?: string;
  };
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseApiError(payload: ApiErrorPayload | null, fallback: string) {
  if (typeof payload?.error === "string") return payload.error;
  if (payload?.error?.message) return payload.error.message;
  return fallback;
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(parseApiError(payload, response.statusText || "Request failed."));
  }

  return payload as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StudyBuddyUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const payload = await apiRequest<{ user: StudyBuddyUser | null }>("/api/auth/session");
      setUser(payload.user);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    refreshSession().catch(() => {
      setUser(null);
      setIsReady(true);
    });
  }, [refreshSession]);

  const signUp = useCallback(async (input: { name: string; email: string; password: string }) => {
    const payload = await apiRequest<{ user: StudyBuddyUser }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setUser(payload.user);
  }, []);

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    const payload = await apiRequest<{ user: StudyBuddyUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setUser(payload.user);
  }, []);

  const signOut = useCallback(async () => {
    await apiRequest<{ ok: boolean }>("/api/auth/logout", { method: "POST" }).catch(() => ({ ok: true }));
    await nextAuthSignOut({ redirect: false }).catch(() => undefined);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (input: { name: string; email: string }) => {
    const payload = await apiRequest<{ user: StudyBuddyUser }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    setUser(payload.user);
  }, []);

  const changePassword = useCallback(async (input: { currentPassword: string; newPassword: string }) => {
    await apiRequest<{ ok: boolean }>("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    isReady,
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    refreshSession,
  }), [changePassword, isReady, refreshSession, signIn, signOut, signUp, updateProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
