"use client";

// Field controls ported from lushaiedu_pls_web/components/ui/Field.tsx, plus the quick-add and
// click-to-rename helpers used across the Content workspace.
import { forwardRef, useId, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, X } from "lucide-react";
import { Button, IconButton } from "./button";

const CONTROL_CLASSES =
  "h-11 w-full rounded-control border bg-surface px-3 text-sm text-ink shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-ink-subtle focus:ring-4 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted disabled:shadow-none";
const NORMAL_CLASSES = "border-line-strong hover:border-ink/25 focus:border-accent focus:ring-accent/10";
const ERROR_CLASSES = "border-danger focus:ring-danger/10";

/** Class string for a bare input/select (when a labelled field isn't wanted). */
export const inputClass = `${CONTROL_CLASSES} ${NORMAL_CLASSES}`;

function FieldShell({
  label,
  error,
  hint,
  htmlFor,
  children,
  className = ""
}: {
  label?: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`block ${className}`}>
      {label ? <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span> : null}
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

type Labelled = { label?: string; error?: string; hint?: string };

export const TextField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & Labelled>(function TextField(
  { label, error, hint, className = "", id, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={fieldId} className={className}>
      <input ref={ref} id={fieldId} className={`${CONTROL_CLASSES} ${error ? ERROR_CLASSES : NORMAL_CLASSES}`} {...rest} />
    </FieldShell>
  );
});

export const SelectField = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & Labelled & { options: { value: string; label: string }[] }
>(function SelectField({ label, error, hint, className = "", id, options, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={fieldId} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          className={`${CONTROL_CLASSES} cursor-pointer appearance-none pr-9 ${error ? ERROR_CLASSES : NORMAL_CLASSES}`}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
      </div>
    </FieldShell>
  );
});

export const TextAreaField = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & Labelled>(
  function TextAreaField({ label, error, hint, className = "", id, rows = 3, ...rest }, ref) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell label={label} error={error} hint={hint} htmlFor={fieldId} className={className}>
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          className={`${CONTROL_CLASSES} h-auto resize-y py-2.5 leading-relaxed ${error ? ERROR_CLASSES : NORMAL_CLASSES}`}
          {...rest}
        />
      </FieldShell>
    );
  }
);

/** File picker styled like the other controls. */
export function FileField({
  label,
  hint,
  accept,
  inputKey,
  file,
  onFile
}: {
  label: string;
  hint?: string;
  accept?: string;
  inputKey?: number;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <div className={`${inputClass} relative flex items-center gap-2`}>
        <span className="shrink-0 rounded-md bg-surface-muted px-2 py-1 text-xs font-semibold text-ink">Choose file</span>
        <span className={`truncate text-sm ${file ? "text-ink" : "text-ink-subtle"}`}>{file ? file.name : "No file selected"}</span>
        <input
          key={inputKey}
          id={id}
          type="file"
          accept={accept}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>
    </FieldShell>
  );
}

/** One-line "type a name and press Enter" form used for quick adds in the tree and lists. */
export function InlineAdd({
  placeholder,
  onSubmit,
  busy,
  onCancel,
  autoFocus = true,
  size = "sm"
}: {
  placeholder: string;
  onSubmit: (value: string) => Promise<unknown> | void;
  busy?: boolean;
  onCancel?: () => void;
  autoFocus?: boolean;
  size?: "sm" | "md";
}) {
  const [value, setValue] = useState("");
  const height = size === "sm" ? "h-9" : "h-11";
  return (
    <form
      className="flex items-center gap-1.5"
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
        className={`${inputClass} ${height} min-w-0 flex-1`}
      />
      <Button type="submit" size="sm" variant="accent" loading={busy} disabled={!value.trim()} icon={<Plus size={14} />} className={height}>
        Add
      </Button>
      {onCancel && (
        <IconButton label="Cancel" onClick={onCancel}>
          <X size={16} />
        </IconButton>
      )}
    </form>
  );
}

/** Click-to-rename title. */
export function EditableTitle({
  value,
  onSave,
  className = "text-xl font-semibold tracking-tight text-ink sm:text-2xl"
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
        className={`${className} group -mx-1.5 flex max-w-full items-center gap-2 rounded-control px-1.5 text-left hover:bg-surface-muted`}
        title="Click to rename"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        <span className="truncate">{value}</span>
        <Pencil size={14} className="shrink-0 text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </button>
    );
  }
  return (
    <form
      className="flex max-w-xl items-center gap-2"
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
        className={inputClass}
      />
      <Button type="submit" variant="primary" icon={<Check size={16} />}>
        Save
      </Button>
      <Button variant="secondary" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </form>
  );
}
