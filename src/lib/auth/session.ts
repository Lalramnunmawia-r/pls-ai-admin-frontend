"use client";

import type { AuthSession } from "../types";

const KEY = "lms-ai-admin-session";

export const getSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const setSession = (session: AuthSession): void => {
  window.localStorage.setItem(KEY, JSON.stringify(session));
};

export const clearSession = (): void => {
  window.localStorage.removeItem(KEY);
};
