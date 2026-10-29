"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentApi, qk, type V2ContentBlock } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { buttonClass, dangerButtonClass, Field, ghostButtonClass, inputClass } from "@/components/ui/form";

const NEW_BLOCK_TYPES = ["notes", "text", "definition", "key_point", "example", "summary"];

/** The subtopic's learning content (what students read and what the AI tutor answers from). */
export function BlocksTab({ subtopicId }: { subtopicId: string }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const content = useQuery({ queryKey: qk.subtopicContent(subtopicId), queryFn: () => contentApi.subtopicContent(subtopicId) });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.subtopicContent(subtopicId) }),
      queryClient.invalidateQueries({ queryKey: qk.subtopicSummary(subtopicId) })
    ]);

  const save = useMutation({
    mutationFn: (input: { id: string; title: string; content_text: string }) =>
      contentApi.updateBlock(input.id, { title: input.title, content_text: input.content_text }),
    onSuccess: async () => {
      feedback.success("Saved and re-indexed for the AI tutor.");
      setEditing(null);
      await refresh();
    },
    onError: (err) => feedback.error(err, "Save failed")
  });
  const add = useMutation({
    mutationFn: (input: { title: string; content_text: string; block_type: string }) => contentApi.addBlock(subtopicId, input),
    onSuccess: async () => {
      feedback.success("Content added.");
      setAdding(false);
      await refresh();
    },
    onError: (err) => feedback.error(err, "Could not add content")
  });
  const remove = useMutation({
    mutationFn: contentApi.deleteBlock,
    onSuccess: async () => {
      feedback.success("Content removed.");
      await refresh();
    },
    onError: (err) => feedback.error(err, "Delete failed")
  });

  if (content.isLoading) return <p className="text-sm text-slate-500">Loading content…</p>;
  if (content.error) return <p className="text-sm text-red-600">Failed to load content.</p>;
  const blocks = content.data?.content_blocks ?? [];

  return (
    <div className="space-y-3">
      {blocks.length === 0 && !adding && <p className="text-sm text-slate-500">No content in this subtopic yet.</p>}
      {blocks.map((block) =>
        editing === block.id ? (
          <BlockEditor
            key={block.id}
            initialTitle={block.title ?? ""}
            initialText={block.content_text ?? ""}
            busy={save.isPending}
            onCancel={() => setEditing(null)}
            onSave={(title, text) => save.mutate({ id: block.id, title, content_text: text })}
          />
        ) : (
          <BlockCard
            key={block.id}
            block={block}
            onEdit={() => setEditing(block.id)}
            onDelete={async () => {
              const ok = await feedback.confirm("Delete this content block? It is also removed from the AI tutor.", {
                confirmLabel: "Delete",
                danger: true
              });
              if (ok) remove.mutate(block.id);
            }}
          />
        )
      )}
      {adding ? (
        <BlockEditor
          withType
          busy={add.isPending}
          onCancel={() => setAdding(false)}
          onSave={(title, text, type) => add.mutate({ title, content_text: text, block_type: type ?? "notes" })}
        />
      ) : (
        <button className={ghostButtonClass} onClick={() => setAdding(true)}>
          + Add notes
        </button>
      )}
    </div>
  );
}

function BlockCard({ block, onEdit, onDelete }: { block: V2ContentBlock; onEdit: () => void; onDelete: () => void }) {
  const image = block.ai_image_url || block.original_image_url;
  return (
    <article className="rounded-lg border p-3">
      <header className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] uppercase text-slate-600">{block.block_type.replace("_", " ")}</span>
        {block.title && <h4 className="text-sm font-medium">{block.title}</h4>}
        {block.is_reported && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">reported</span>}
        {block.page_number != null && <span className="text-xs text-slate-400">p. {block.page_number}</span>}
        <div className="ml-auto flex gap-1">
          <button className={ghostButtonClass} onClick={onEdit}>
            Edit
          </button>
          <button className={dangerButtonClass} onClick={onDelete}>
            Delete
          </button>
        </div>
      </header>
      {/* eslint-disable-next-line @next/next/no-img-element -- R2 figure URLs, not optimizable assets */}
      {image && <img src={image} alt={block.title ?? "Figure"} className="mb-2 max-h-48 rounded border" />}
      {block.content_text && <p className="whitespace-pre-wrap text-sm text-slate-700 line-clamp-6">{block.content_text}</p>}
      {block.youtube_video_id && (
        <a className="text-xs text-sky-700 underline" href={`https://youtu.be/${block.youtube_video_id}`} target="_blank" rel="noreferrer">
          Watch video
        </a>
      )}
    </article>
  );
}

function BlockEditor({
  initialTitle = "",
  initialText = "",
  withType,
  busy,
  onSave,
  onCancel
}: {
  initialTitle?: string;
  initialText?: string;
  withType?: boolean;
  busy: boolean;
  onSave: (title: string, text: string, type?: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const [type, setType] = useState(NEW_BLOCK_TYPES[0]);
  return (
    <div className="space-y-2 rounded-lg border border-slate-300 bg-slate-50 p-3">
      <div className="grid gap-2 md:grid-cols-3">
        <div className={withType ? "md:col-span-2" : "md:col-span-3"}>
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
        </div>
        {withType && (
          <Field label="Kind">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              {NEW_BLOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <Field label="Text">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className={inputClass} />
      </Field>
      <div className="flex gap-2">
        <button
          className={buttonClass}
          disabled={busy || !title.trim() || !text.trim()}
          onClick={() => onSave(title.trim(), text.trim(), withType ? type : undefined)}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button className="rounded border px-3 py-2 text-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
