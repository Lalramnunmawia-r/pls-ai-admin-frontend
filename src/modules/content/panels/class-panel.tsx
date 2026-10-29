"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Trash2 } from "lucide-react";
import { contentApi, type V2Class } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { EditableTitle, InlineAdd } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/layout";
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
    <div>
      <PageHeader
        eyebrow="Class"
        title={<EditableTitle value={cls.name} onSave={(name) => rename.mutateAsync(name)} />}
        subtitle={`${cls.subjects.length} subject${cls.subjects.length === 1 ? "" : "s"}`}
        actions={
          <Button
            variant="soft-danger"
            size="sm"
            icon={<Trash2 size={14} />}
            loading={remove.isPending}
            onClick={async () => {
              const ok = await feedback.confirm(`Delete ${cls.name}? It disappears from the admin and from apps linked to its subjects.`, {
                confirmLabel: "Delete",
                danger: true
              });
              if (ok) remove.mutate();
            }}
          >
            Delete class
          </Button>
        }
      />

      <SectionTitle>Subjects</SectionTitle>
      {cls.subjects.length === 0 ? (
        <EmptyState icon={<BookOpen size={22} />} title="No subjects yet" message="Add the first subject for this class below." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cls.subjects.map((s) => (
            <Card key={s.id} interactive onClick={() => onSelect({ class: cls.id, subject: s.id })} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                <BookOpen size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{s.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {s.chapter_count} chapter{s.chapter_count === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight size={16} className="text-ink-subtle" />
            </Card>
          ))}
        </div>
      )}
      <div className="mt-4 max-w-md">
        <InlineAdd
          size="md"
          placeholder="New subject name"
          autoFocus={false}
          busy={addSubject.isPending}
          onSubmit={(name) => addSubject.mutateAsync(name).catch(() => undefined)}
        />
      </div>
    </div>
  );
}
