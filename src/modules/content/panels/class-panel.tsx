"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contentApi, type V2Class } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { dangerButtonClass, EditableTitle, InlineAdd } from "@/components/ui/form";
import type { Selection } from "../selection";

export function ClassPanel({ cls, onSelect }: { cls: V2Class; onSelect: (next: Selection) => void }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const refreshTree = () => queryClient.invalidateQueries({ queryKey: ["v2", "tree"] });

  const rename = useMutation({
    mutationFn: (name: string) => contentApi.updateClass(cls.id, { name }),
    onSuccess: refreshTree,
    onError: (err) => feedback.error(err, "Rename failed")
  });
  const remove = useMutation({
    mutationFn: () => contentApi.deleteClass(cls.id),
    onSuccess: async () => {
      feedback.success(`${cls.name} deleted.`);
      await refreshTree();
      onSelect({});
    },
    onError: (err) => feedback.error(err, "Delete failed")
  });
  const addSubject = useMutation({
    mutationFn: (name: string) => contentApi.createSubject({ class_id: cls.id, name }),
    onSuccess: async (created) => {
      await refreshTree();
      onSelect({ class: cls.id, subject: created.id });
    },
    onError: (err) => feedback.error(err, "Could not add subject")
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Class</p>
          <EditableTitle value={cls.name} onSave={(name) => rename.mutateAsync(name)} />
        </div>
        <button
          className={dangerButtonClass}
          onClick={async () => {
            const ok = await feedback.confirm(
              `Delete ${cls.name}? It disappears from the admin and from apps linked to its subjects.`,
              { confirmLabel: "Delete", danger: true }
            );
            if (ok) remove.mutate();
          }}
        >
          Delete class
        </button>
      </header>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Subjects</h3>
        {cls.subjects.length === 0 && <p className="text-sm text-slate-500">No subjects yet.</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cls.subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect({ class: cls.id, subject: s.id })}
              className="rounded-lg border p-3 text-left hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-slate-500">
                {s.chapter_count} chapter{s.chapter_count === 1 ? "" : "s"}
              </div>
            </button>
          ))}
        </div>
        <div className="max-w-sm pt-1">
          <InlineAdd placeholder="New subject name" autoFocus={false} busy={addSubject.isPending} onSubmit={(name) => addSubject.mutateAsync(name).catch(() => undefined)} />
        </div>
      </section>
    </div>
  );
}
