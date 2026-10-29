"use client";

// Page-level pieces ported from lushaiedu_pls_web/components/ui/Shared.tsx and Layout.tsx.
import { Inbox, Info, TriangleAlert } from "lucide-react";

export function PageContainer({ children, className = "max-w-7xl" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full px-4 py-5 sm:px-6 sm:py-8 ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  className = ""
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 ${className}`}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="truncate text-xs font-medium text-ink-muted">{eyebrow}</p> : null}
        {typeof title === "string" ? (
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        ) : (
          title
        )}
        {subtitle ? <div className="mt-0.5 text-sm text-ink-muted">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({ children, trailing }: { children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold tracking-tight text-ink">{children}</h2>
      {trailing}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  icon,
  action,
  className = ""
}: {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-12 text-center ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-muted shadow-sm" aria-hidden>
        {icon ?? <Inbox size={22} />}
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{message}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-control bg-surface-muted ${className}`} />;
}

/** A few placeholder rows while a list loads. */
export function SkeletonList({ rows = 3, className = "h-14" }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" | "danger" }) {
  const styles = {
    info: "border-info/20 bg-info-soft text-info",
    warning: "border-warning/20 bg-warning-soft text-warning",
    danger: "border-danger/20 bg-danger-soft text-danger"
  }[tone];
  const Icon = tone === "info" ? Info : TriangleAlert;
  return (
    <div className={`flex items-start gap-2.5 rounded-control border px-3.5 py-3 text-sm ${styles}`}>
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
