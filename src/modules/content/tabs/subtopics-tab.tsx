"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentApi, moveId, qk, type V2Subtopic } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { ghostButtonClass, InlineAdd } from "@/components/ui/form";

/** Manage a chapter's subtopic tree: add (incl. nested), rename, reorder, hide/restore. */
export function SubtopicsTab({ chapterId, onOpen }: { chapterId: string; onOpen: (subtopicId: string) => void }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const [addingUnder, setAddingUnder] = useState<string | "root" | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const subtopics = useQuery({ queryKey: qk.subtopics(chapterId), queryFn: () => contentApi.subtopics(chapterId) });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.subtopics(chapterId) }),
      queryClient.invalidateQueries({ queryKey: qk.chapterSummary(chapterId) }),
      queryClient.invalidateQueries({ queryKey: ["v2", "chapters"] })
    ]);

  const create = useMutation({
    mutationFn: (input: { title: string; parentId: string | null }) =>
      contentApi.createSubtopic(chapterId, { title: input.title, parent_id: input.parentId }),
    onSuccess: refresh,
    onError: (err) => feedback.error(err, "Could not add subtopic")
  });
  const update = useMutation({
    mutationFn: (input: { id: string; title?: string; hidden?: boolean }) =>
      contentApi.updateSubtopic(input.id, { title: input.title, hidden: input.hidden }),
    onSuccess: async (_, input) => {
      if (input.hidden !== undefined) feedback.success(input.hidden ? "Hidden from students." : "Visible to students again.");
      setRenaming(null);
      await refresh();
    },
    onError: (err) => feedback.error(err, "Update failed")
  });
  const reorder = useMutation({
    mutationFn: (input: { ids: string[]; parentId: string | null }) =>
      contentApi.reorderSubtopics(chapterId, input.ids, input.parentId),
    onSuccess: (tree) => queryClient.setQueryData(qk.subtopics(chapterId), tree),
    onError: (err) => feedback.error(err, "Reorder failed")
  });

  const renderLevel = (nodes: V2Subtopic[], parentId: string | null, depth: number): React.ReactNode => {
    const ids = nodes.map((n) => n.id);
    return (
      <ul className={depth === 0 ? "divide-y rounded-lg border" : "border-l pl-4"}>
        {nodes.map((node, index) => (
          <li key={node.id} className={depth === 0 ? "px-3 py-2" : "py-1.5"}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="flex flex-col">
                <button
                  aria-label="Move up"
                  className="text-[10px] leading-none text-slate-400 hover:text-slate-900 disabled:opacity-20"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => {
                    const next = moveId(ids, node.id, -1);
                    if (next) reorder.mutate({ ids: next, parentId });
                  }}
                >
                  ▲
                </button>
                <button
                  aria-label="Move down"
                  className="text-[10px] leading-none text-slate-400 hover:text-slate-900 disabled:opacity-20"
                  disabled={index === nodes.length - 1 || reorder.isPending}
                  onClick={() => {
                    const next = moveId(ids, node.id, 1);
                    if (next) reorder.mutate({ ids: next, parentId });
                  }}
                >
                  ▼
                </button>
              </div>
              {renaming === node.id ? (
                <div className="flex-1">
                  <RenameInput
                    initial={node.title}
                    onCancel={() => setRenaming(null)}
                    onSave={(title) => update.mutate({ id: node.id, title })}
                  />
                </div>
              ) : (
                <button
                  className={`min-w-0 flex-1 truncate text-left hover:underline ${node.hidden ? "text-slate-400" : ""}`}
                  onClick={() => onOpen(node.id)}
                >
                  {node.section_number && <span className="text-slate-400">{node.section_number} </span>}
                  {node.title}
                  {node.hidden && <span className="ml-2 text-[10px] uppercase">hidden</span>}
                </button>
              )}
              <div className="flex gap-1">
                <button className={ghostButtonClass} onClick={() => setRenaming(node.id)}>
                  Rename
                </button>
                <button className={ghostButtonClass} onClick={() => setAddingUnder(node.id)}>
                  + Sub
                </button>
                <button
                  className={ghostButtonClass}
                  disabled={update.isPending}
                  onClick={async () => {
                    if (!node.hidden) {
                      const ok = await feedback.confirm(
                        `Hide "${node.title}" and its sub-subtopics from students? Content is kept and can be restored.`,
                        { confirmLabel: "Hide" }
                      );
                      if (!ok) return;
                    }
                    update.mutate({ id: node.id, hidden: !node.hidden });
                  }}
                >
                  {node.hidden ? "Restore" : "Hide"}
                </button>
              </div>
            </div>
            {(node.children.length > 0 || addingUnder === node.id) && (
              <div className="mt-1.5">
                {node.children.length > 0 && renderLevel(node.children, node.id, depth + 1)}
                {addingUnder === node.id && (
                  <div className="mt-1.5 pl-4">
                    <InlineAdd
                      placeholder={`New subtopic under "${node.title}"`}
                      busy={create.isPending}
                      onCancel={() => setAddingUnder(null)}
                      onSubmit={(title) => create.mutateAsync({ title, parentId: node.id }).catch(() => undefined)}
                    />
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  if (subtopics.isLoading) return <p className="text-sm text-slate-500">Loading subtopics…</p>;
  if (subtopics.error) return <p className="text-sm text-red-600">Failed to load subtopics.</p>;
  const roots = subtopics.data ?? [];

  return (
    <div className="space-y-3">
      {roots.length === 0 ? (
        <p className="text-sm text-slate-500">No subtopics yet. Add the first one below, or upload a textbook PDF on the subject.</p>
      ) : (
        renderLevel(roots, null, 0)
      )}
      {addingUnder === "root" ? (
        <InlineAdd
          placeholder="New subtopic title"
          busy={create.isPending}
          onCancel={() => setAddingUnder(null)}
          onSubmit={(title) => create.mutateAsync({ title, parentId: null }).catch(() => undefined)}
        />
      ) : (
        <button className={ghostButtonClass} onClick={() => setAddingUnder("root")}>
          + Add subtopic
        </button>
      )}
    </div>
  );
}

function RenameInput({ initial, onSave, onCancel }: { initial: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="flex gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed && trimmed !== initial) onSave(trimmed);
        else onCancel();
      }}
    >
      <input
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
      />
      <button type="submit" className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
        Save
      </button>
    </form>
  );
}
