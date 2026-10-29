"use client";

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
    <div role="tablist" className="flex flex-wrap gap-1 border-b">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              selected ? "border-slate-900 font-medium text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span className={`ml-1.5 rounded-full px-1.5 text-xs ${selected ? "bg-slate-900 text-white" : "bg-slate-100"}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
