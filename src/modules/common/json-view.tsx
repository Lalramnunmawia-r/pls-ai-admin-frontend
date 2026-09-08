"use client";

export function JsonView({ value }: { value: unknown }) {
  return <pre className="overflow-auto rounded bg-slate-100 p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>;
}
