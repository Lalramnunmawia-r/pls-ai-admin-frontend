"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, Flag, Pencil, Plus, Trash2, MonitorPlay } from "lucide-react";
import { contentApi, qk, type V2ContentBlock } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice, SkeletonList } from "@/components/ui/layout";

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

  if (content.isLoading) return <SkeletonList rows={3} className="h-28" />;
  if (content.error) return <Notice tone="danger">Failed to load content.</Notice>;
  const blocks = content.data?.content_blocks ?? [];

  return (
    <div className="space-y-3">
      {blocks.length === 0 && !adding && (
        <EmptyState
          icon={<FileText size={22} />}
          title="No content yet"
          message="Add notes for students. The AI tutor also uses them to answer questions."
        />
      )}
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
        <Button variant="accent" size="sm" icon={<Plus size={14} />} onClick={() => setAdding(true)}>
          Add notes
        </Button>
      )}
    </div>
  );
}

function BlockCard({ block, onEdit, onDelete }: { block: V2ContentBlock; onEdit: () => void; onDelete: () => void }) {
  const image = block.ai_image_url || block.original_image_url;
  return (
    <Card>
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <Badge className="uppercase">{block.block_type.replace("_", " ")}</Badge>
        {block.title && <h4 className="min-w-0 truncate text-sm font-semibold text-ink">{block.title}</h4>}
        {block.is_reported && (
          <Badge tone="warning" className="gap-1">
            <Flag size={10} /> reported
          </Badge>
        )}
        {block.page_number != null && <span className="text-xs text-ink-subtle">p. {block.page_number}</span>}
        <div className="ml-auto flex gap-0.5">
          <IconButton label="Edit" onClick={onEdit}>
            <Pencil size={14} />
          </IconButton>
          <IconButton label="Delete" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={onDelete}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </header>
      {/* eslint-disable-next-line @next/next/no-img-element -- R2 figure URLs, not optimizable assets */}
      {image && <img src={image} alt={block.title ?? "Figure"} className="mb-2 max-h-48 rounded-control border border-line" />}
      {block.content_text && <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{block.content_text}</p>}
      {block.youtube_video_id && (
        <a
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
          href={`https://youtu.be/${block.youtube_video_id}`}
          target="_blank"
          rel="noreferrer"
        >
          <MonitorPlay size={14} /> Watch video
        </a>
      )}
    </Card>
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
    <Card padding="p-5" elevated className="space-y-4 border-line-strong">
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Title" className={withType ? "md:col-span-2" : "md:col-span-3"} value={title} onChange={(e) => setTitle(e.target.value)} />
        {withType && (
          <SelectField
            label="Kind"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={NEW_BLOCK_TYPES.map((t) => ({ value: t, label: t.replace("_", " ") }))}
          />
        )}
      </div>
      <TextAreaField label="Text" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2">
        <Button
          icon={<Check size={16} />}
          loading={busy}
          disabled={!title.trim() || !text.trim()}
          onClick={() => onSave(title.trim(), text.trim(), withType ? type : undefined)}
        >
          Save
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
