"use client";

const tones: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  review: "bg-amber-100 text-amber-800",
  processing: "bg-sky-100 text-sky-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
  archived: "bg-slate-200 text-slate-700"
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.trim().toLowerCase();
  if (!key) return <span className="text-slate-400">—</span>;
  const tone = tones[key] ?? "bg-slate-100 text-slate-700";
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}
