"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Link2, Paperclip, Plus, RotateCw, Trash2, MonitorPlay } from "lucide-react";
import { contentApi, flattenSubtopics, qk, type Resource } from "@/lib/api/admin-v2";
import { requireText, validateHttpUrl } from "@/lib/forms/upload-validation";
import { useFeedback } from "@/components/ui/feedback";
import { FileField, SelectField, TextField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice, SkeletonList } from "@/components/ui/layout";
import { StatusBadge } from "../../common/status-badge";

type Kind = "file" | "youtube" | "link";

const LABELS: Record<Kind, string[]> = {
  file: ["reference", "notes", "practice", "question_bank", "solution"],
  youtube: ["video", "reference", "notes"],
  link: ["reference", "notes", "video"]
};

const KINDS: { key: Kind; label: string; icon: React.ReactNode }[] = [
  { key: "file", label: "File", icon: <Paperclip size={13} /> },
  { key: "youtube", label: "YouTube", icon: <MonitorPlay size={13} /> },
  { key: "link", label: "Link", icon: <Link2 size={13} /> }
];

const FILE_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx";

function viewUrl(row: Resource): string | null {
  return row.file_url || row.youtube_url || row.external_url;
}

function ResourceIcon({ type }: { type: string }) {
  const Icon = type === "youtube" ? MonitorPlay : type === "link" ? Link2 : FileText;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-muted text-ink-muted">
      <Icon size={18} />
    </span>
  );
}

/**
 * Resources for a chapter (subtopicId omitted) or one subtopic. Uploads are pre-scoped to
 * the selected node, so there is nothing to pick.
 */
export function ResourcesTab({ chapterId, subtopicId }: { chapterId: string; subtopicId?: string }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const [kind, setKind] = useState<Kind>("file");
  const [title, setTitle] = useState("");
  const [label, setLabel] = useState(LABELS.file[0]);
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const resources = useQuery({ queryKey: qk.resources(chapterId, subtopicId), queryFn: () => contentApi.resources(chapterId, subtopicId) });
  // Chapter-level view shows which subtopic each resource belongs to.
  const subtopics = useQuery({ queryKey: qk.subtopics(chapterId), queryFn: () => contentApi.subtopics(chapterId), enabled: !subtopicId });
  const subtopicTitle = new Map(flattenSubtopics(subtopics.data ?? []).map((s) => [s.id, s.title]));

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["v2", "resources", chapterId] }),
      queryClient.invalidateQueries({ queryKey: qk.chapterSummary(chapterId) }),
      subtopicId ? queryClient.invalidateQueries({ queryKey: qk.subtopicSummary(subtopicId) }) : undefined
    ]);

  const add = useMutation({
    mutationFn: async () => {
      const base = { chapterId, sectionId: subtopicId, title: title.trim(), label };
      if (kind === "file") return contentApi.uploadResourceFile({ ...base, file: file as File });
      if (kind === "youtube") return contentApi.addYouTube({ ...base, url: url.trim(), notes: notes.trim() });
      return contentApi.addLink({ ...base, url: url.trim() });
    },
    onSuccess: async () => {
      feedback.success("Resource added. Indexing runs in the background.");
      setTitle("");
      setUrl("");
      setNotes("");
      setFile(null);
      setFileInputKey((k) => k + 1);
      await refresh();
    },
    onError: (err) => feedback.error(err, "Upload failed")
  });
  const remove = useMutation({
    mutationFn: contentApi.deleteResource,
    onSuccess: async () => {
      feedback.success("Resource deleted.");
      await refresh();
    },
    onError: (err) => feedback.error(err, "Delete failed")
  });
  const retry = useMutation({
    mutationFn: contentApi.retryResource,
    onSuccess: async () => {
      feedback.success("Re-indexing started.");
      await refresh();
    },
    onError: (err) => feedback.error(err, "Retry failed")
  });

  const submit = () => {
    const problem =
      requireText(title, "Title") ??
      (kind === "file" ? (file ? null : "Choose a file.") : validateHttpUrl(url, kind === "youtube" ? "YouTube URL" : "URL")) ??
      (kind === "youtube" && !/(youtube\.com|youtu\.be)/i.test(url) ? "That is not a YouTube link." : null);
    if (problem) return feedback.error(new Error(problem));
    add.mutate();
  };

  const rows = resources.data ?? [];

  return (
    <div className="space-y-5">
      <Card padding="p-5" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-ink">Add resource {subtopicId ? "to this subtopic" : "to this chapter"}</p>
          <div className="inline-flex gap-1 rounded-full border border-line bg-surface p-1 shadow-sm">
            {KINDS.map((k) => (
              <button
                key={k.key}
                onClick={() => {
                  setKind(k.key);
                  setLabel(LABELS[k.key][0]);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  kind === k.key ? "bg-ink text-white" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {k.icon}
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Worked examples" />
          <SelectField
            label="Type"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            options={LABELS[kind].map((value) => ({ value, label: value.replace("_", " ") }))}
          />
          {kind === "file" ? (
            <FileField label="File" hint="PDF, Word or PowerPoint" accept={FILE_ACCEPT} inputKey={fileInputKey} file={file} onFile={setFile} />
          ) : (
            <TextField
              label={kind === "youtube" ? "YouTube URL" : "URL"}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
            />
          )}
        </div>
        {kind === "youtube" && (
          <TextField
            label="Notes for the AI tutor (optional)"
            hint="What the video covers. Helps the tutor recommend it."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
        <Button variant="accent" icon={<Plus size={16} />} loading={add.isPending} onClick={submit}>
          Add resource
        </Button>
      </Card>

      {resources.isLoading && <SkeletonList rows={3} className="h-16" />}
      {resources.error && <Notice tone="danger">Failed to load resources.</Notice>}
      {resources.data && rows.length === 0 && (
        <EmptyState icon={<Paperclip size={22} />} title="No resources yet" message="Files, videos and links you add appear here." />
      )}
      {rows.length > 0 && (
        <Card padding="p-0" className="divide-y divide-line overflow-hidden">
          {rows.map((row) => {
            const href = viewUrl(row);
            return (
              <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-muted/50">
                <ResourceIcon type={row.resource_type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{row.title}</p>
                  <p className="text-xs text-ink-muted">
                    {row.label.replace("_", " ")}
                    {!subtopicId && <> · {row.section_id ? subtopicTitle.get(row.section_id) ?? "Subtopic" : "Whole chapter"}</>}
                  </p>
                </div>
                <StatusBadge status={row.status} />
                <div className="flex gap-1.5">
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition-colors hover:border-line-strong hover:bg-surface-muted"
                    >
                      <ExternalLink size={14} /> Open
                    </a>
                  )}
                  {row.status === "failed" && (
                    <Button size="sm" variant="secondary" icon={<RotateCw size={14} />} disabled={retry.isPending} onClick={() => retry.mutate(row.id)}>
                      Retry
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="soft-danger"
                    icon={<Trash2 size={14} />}
                    disabled={remove.isPending}
                    onClick={async () => {
                      const ok = await feedback.confirm(`Delete "${row.title}"? This removes the file and its AI index.`, {
                        confirmLabel: "Delete",
                        danger: true
                      });
                      if (ok) remove.mutate(row.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
