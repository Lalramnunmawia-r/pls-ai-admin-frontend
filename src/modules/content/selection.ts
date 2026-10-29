"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** The selected node path, kept in the URL so links are shareable and back/forward works. */
export type Selection = {
  board?: string;
  class?: string;
  subject?: string;
  chapter?: string;
  subtopic?: string;
};

const KEYS = ["board", "class", "subject", "chapter", "subtopic"] as const;

export type NodeLevel = "none" | "class" | "subject" | "chapter" | "subtopic";

export function selectionLevel(selection: Selection): NodeLevel {
  if (selection.subtopic) return "subtopic";
  if (selection.chapter) return "chapter";
  if (selection.subject) return "subject";
  if (selection.class) return "class";
  return "none";
}

export function useSelection() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selection = useMemo<Selection>(() => {
    const out: Selection = {};
    for (const key of KEYS) {
      const value = params.get(key);
      if (value) out[key] = value;
    }
    return out;
  }, [params]);

  /** Replace the selection; keeps the board unless a new one is given. */
  const select = useCallback(
    (next: Selection) => {
      const query = new URLSearchParams();
      const merged: Selection = { board: selection.board, ...next };
      for (const key of KEYS) {
        const value = merged[key];
        if (value) query.set(key, value);
      }
      const suffix = query.toString();
      router.push(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    },
    [pathname, router, selection.board]
  );

  return { selection, select, level: selectionLevel(selection) };
}
