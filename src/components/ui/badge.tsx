"use client";

// Badge and StatusChip ported from lushaiedu_pls_web/components/ui (Layout.tsx / Shared.tsx).

export type Tone = "accent" | "neutral" | "success" | "warning" | "danger" | "info";

const BADGE_TONES: Record<Tone, string> = {
  accent: "bg-accent text-white",
  neutral: "bg-surface-muted text-ink-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info"
};

export function Badge({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusChip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_TONES[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
