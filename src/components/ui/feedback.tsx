"use client";

// Toasts + a promise-based confirm dialog. Visuals follow lushaiedu_pls_web Toast.tsx and
// ConfirmDialog in Modal.tsx.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { Button } from "./button";

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

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (tone: Toast["tone"], message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 3500);
    },
    [dismiss]
  );

  const api: FeedbackApi = {
    success: (message) => push("success", message),
    error: (error, fallback) => push("error", errorMessage(error, fallback)),
    confirm: (message, options) =>
      new Promise<boolean>((resolve) =>
        setPending({ message, confirmLabel: options?.confirmLabel ?? "Confirm", danger: options?.danger ?? false, resolve })
      )
  };

  const settle = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending]
  );

  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && settle(false);
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [pending, settle]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-card px-4 py-3 text-sm font-medium shadow-overlay ${
              toast.tone === "success" ? "bg-ink text-white" : "bg-danger text-white"
            }`}
          >
            {toast.tone === "success" ? (
              <CircleCheck size={18} className="mt-px shrink-0" aria-hidden />
            ) : (
              <CircleAlert size={18} className="mt-px shrink-0" aria-hidden />
            )}
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button aria-label="Dismiss" onClick={() => dismiss(toast.id)} className="shrink-0 opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      {pending && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
          onClick={() => settle(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md rounded-card border border-line bg-surface p-5 shadow-overlay outline-none sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-lg font-semibold tracking-tight text-ink">
              {pending.danger ? "Are you sure?" : "Please confirm"}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">{pending.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => settle(false)} autoFocus>
                Cancel
              </Button>
              <Button variant={pending.danger ? "danger" : "primary"} onClick={() => settle(true)}>
                {pending.confirmLabel}
              </Button>
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
