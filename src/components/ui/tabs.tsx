"use client";

// Segmented pill tabs, styled like FilterChips in lushaiedu_pls_web/components/ui/Layout.tsx.

export type TabItem<K extends string> = { key: K; label: string; count?: number };

export function Tabs<K extends string>({
  tabs,
  active,
  onChange
}: {
  tabs: TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-sm"
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              selected ? "bg-ink text-white" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={`inline-flex min-w-[18px] justify-center rounded-full px-1.5 py-0.5 text-[10px] leading-none tabular-nums ${
                  selected ? "bg-white/20 text-white" : "bg-surface-muted text-ink-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
