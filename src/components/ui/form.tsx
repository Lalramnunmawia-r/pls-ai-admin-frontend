"use client";

import { useState } from "react";

export const inputClass = "w-full rounded border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";
export const buttonClass = "rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50";
export const ghostButtonClass = "rounded border px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-40";
export const dangerButtonClass = "rounded border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/** One-line "type a name and press Enter" form used for quick adds in the tree and lists. */
export function InlineAdd({
  placeholder,
  onSubmit,
  busy,
  onCancel,
  autoFocus = true
}: {
  placeholder: string;
  onSubmit: (value: string) => Promise<unknown> | void;
  busy?: boolean;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-1"
      onSubmit={async (event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        await onSubmit(trimmed);
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && onCancel?.()}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
      />
      <button type="submit" disabled={busy || !value.trim()} className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50">
        Add
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="rounded px-1.5 text-xs text-slate-500 hover:bg-slate-100">
          ✕
        </button>
      )}
    </form>
  );
}

/** Click-to-rename title. */
export function EditableTitle({
  value,
  onSave,
  className = "text-lg font-semibold"
}: {
  value: string;
  onSave: (next: string) => Promise<unknown>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!editing) {
    return (
      <button
        className={`${className} rounded text-left hover:bg-slate-100`}
        title="Click to rename"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        {value} <span className="text-xs font-normal text-slate-400">✎</span>
      </button>
    );
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const trimmed = draft.trim();
        if (trimmed && trimmed !== value) await onSave(trimmed);
        setEditing(false);
      }}
    >
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && setEditing(false)}
        autoFocus
        className={`${inputClass} max-w-md`}
      />
      <button type="submit" className={buttonClass}>
        Save
      </button>
    </form>
  );
}
