"use client";

import { StatusChip, type Tone } from "@/components/ui/badge";

const tones: Record<string, Tone> = {
  approved: "success",
  completed: "success",
  ready: "success",
  review: "warning",
  pending: "warning",
  processing: "info",
  failed: "danger",
  rejected: "danger",
  archived: "neutral"
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.trim().toLowerCase();
  if (!key) return <span className="text-ink-subtle">—</span>;
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return <StatusChip tone={tones[key] ?? "neutral"}>{label}</StatusChip>;
}
