"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, CornerDownRight, Eye, EyeOff, ListTree, Pencil, Plus } from "lucide-react";
import { contentApi, moveId, qk, type V2Subtopic } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { InlineAdd, inputClass } from "@/components/ui/form";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice, SkeletonList } from "@/components/ui/layout";

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
    mutationFn: (input: { ids: string[]; parentId: string | null }) => contentApi.reorderSubtopics(chapterId, input.ids, input.parentId),
    onSuccess: (tree) => queryClient.setQueryData(qk.subtopics(chapterId), tree),
    onError: (err) => feedback.error(err, "Reorder failed")
  });

  const renderLevel = (nodes: V2Subtopic[], parentId: string | null, depth: number): React.ReactNode => {
    const ids = nodes.map((n) => n.id);
    return (
      <div className={depth === 0 ? "divide-y divide-line" : "ml-6 border-l border-line"}>
        {nodes.map((node, index) => (
          <div key={node.id}>
            <div className={`flex flex-wrap items-center gap-2 py-2 pr-3 text-sm ${depth === 0 ? "pl-2" : "pl-3"}`}>
              <div className="flex flex-col">
                <IconButton
                  label="Move up"
                  size={20}
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => {
                    const next = moveId(ids, node.id, -1);
                    if (next) reorder.mutate({ ids: next, parentId });
                  }}
                >
                  <ChevronUp size={13} />
                </IconButton>
                <IconButton
                  label="Move down"
                  size={20}
                  disabled={index === nodes.length - 1 || reorder.isPending}
                  onClick={() => {
                    const next = moveId(ids, node.id, 1);
                    if (next) reorder.mutate({ ids: next, parentId });
                  }}
                >
                  <ChevronDown size={13} />
                </IconButton>
              </div>
              {depth > 0 && <CornerDownRight size={14} className="shrink-0 text-ink-subtle" />}
              {renaming === node.id ? (
                <div className="min-w-[12rem] flex-1">
                  <RenameInput initial={node.title} onCancel={() => setRenaming(null)} onSave={(title) => update.mutate({ id: node.id, title })} />
                </div>
              ) : (
                <button
                  className={`min-w-0 flex-1 truncate text-left font-medium hover:text-accent ${node.hidden ? "text-ink-subtle" : "text-ink"}`}
                  onClick={() => onOpen(node.id)}
                >
                  {node.section_number && <span className="mr-1 tabular-nums text-ink-subtle">{node.section_number}</span>}
                  {node.title}
                  {node.hidden && <Badge className="ml-2">hidden</Badge>}
                </button>
              )}
              <div className="flex items-center gap-0.5">
                <IconButton label="Rename" onClick={() => setRenaming(node.id)}>
                  <Pencil size={14} />
                </IconButton>
                <IconButton label="Add sub-subtopic" onClick={() => setAddingUnder(node.id)}>
                  <Plus size={15} />
                </IconButton>
                <IconButton
                  label={node.hidden ? "Show to students" : "Hide from students"}
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
                  {node.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                </IconButton>
              </div>
            </div>
            {(node.children.length > 0 || addingUnder === node.id) && (
              <div className="pb-2">
                {node.children.length > 0 && renderLevel(node.children, node.id, depth + 1)}
                {addingUnder === node.id && (
                  <div className="ml-6 mt-1 border-l border-line pl-3">
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
          </div>
        ))}
      </div>
    );
  };

  if (subtopics.isLoading) return <SkeletonList rows={5} className="h-12" />;
  if (subtopics.error) return <Notice tone="danger">Failed to load subtopics.</Notice>;
  const roots = subtopics.data ?? [];

  return (
    <div className="space-y-4">
      {roots.length === 0 ? (
        <EmptyState
          icon={<ListTree size={22} />}
          title="No subtopics yet"
          message="Add the first one below, or upload a textbook PDF on the subject to generate them."
        />
      ) : (
        <Card padding="p-1.5">{renderLevel(roots, null, 0)}</Card>
      )}
      {addingUnder === "root" ? (
        <div className="max-w-xl">
          <InlineAdd
            size="md"
            placeholder="New subtopic title"
            busy={create.isPending}
            onCancel={() => setAddingUnder(null)}
            onSubmit={(title) => create.mutateAsync({ title, parentId: null }).catch(() => undefined)}
          />
        </div>
      ) : (
        <Button variant="accent" size="sm" icon={<Plus size={14} />} onClick={() => setAddingUnder("root")}>
          Add subtopic
        </Button>
      )}
    </div>
  );
}

function RenameInput({ initial, onSave, onCancel }: { initial: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="flex items-center gap-1.5"
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
        className={`${inputClass} h-9 min-w-0 flex-1`}
      />
      <Button type="submit" size="sm">
        Save
      </Button>
    </form>
  );
}
