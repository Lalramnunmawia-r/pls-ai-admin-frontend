"use client";

// Ported from lushaiedu_pls_web/components/ui/Card.tsx.

export function Card({
  children,
  padding = "p-4",
  interactive = false,
  elevated = false,
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  padding?: string;
  interactive?: boolean;
  elevated?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-line bg-surface ${padding} ${elevated ? "shadow-raised" : "shadow-card"} ${
        interactive
          ? "cursor-pointer transition-[box-shadow,border-color,transform] hover:-translate-y-px hover:border-line-strong hover:shadow-raised active:translate-y-0"
          : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  trailing,
  className = ""
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-ink-muted">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
