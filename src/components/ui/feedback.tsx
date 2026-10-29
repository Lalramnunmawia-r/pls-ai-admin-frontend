"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = { id: number; tone: "success" | "error"; message: string };
type ConfirmRequest = { message: string; confirmLabel: string; danger: boolean; resolve: (ok: boolean) => void };

type FeedbackApi = {
  success: (message: string) => void;
  error: (error: unknown, fallback?: string) => void;
  confirm: (message: string, options?: { confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Toasts + a promise-based confirm dialog, replacing per-page success/error state and window.confirm. */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const nextId = useRef(1);

  const push = useCallback((tone: Toast["tone"], message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), tone === "error" ? 7000 : 3500);
  }, []);

  const api: FeedbackApi = {
    success: (message) => push("success", message),
    error: (error, fallback) => push("error", errorMessage(error, fallback)),
    confirm: (message, options) =>
      new Promise<boolean>((resolve) =>
        setPending({
          message,
          confirmLabel: options?.confirmLabel ?? "Confirm",
          danger: options?.danger ?? false,
          resolve
        })
      )
  };

  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-md px-4 py-3 text-sm shadow-lg ${
              toast.tone === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => settle(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm text-slate-800">{pending.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded border px-3 py-1.5 text-sm" onClick={() => settle(false)} autoFocus>
                Cancel
              </button>
              <button
                className={`rounded px-3 py-1.5 text-sm text-white ${pending.danger ? "bg-red-600" : "bg-slate-900"}`}
                onClick={() => settle(true)}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside FeedbackProvider");
  return ctx;
}
