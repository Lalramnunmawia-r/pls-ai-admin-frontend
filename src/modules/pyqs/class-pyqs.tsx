"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileQuestion, Plus, RotateCw, Trash2 } from "lucide-react";
import { contentApi, qk, type PyqBooklet, type PyqPart } from "@/lib/api/admin-v2";
import { requireText } from "@/lib/forms/upload-validation";
import { useFeedback } from "@/components/ui/feedback";
import { FileField, TextField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice, SkeletonList } from "@/components/ui/layout";
import { StatusBadge } from "../common/status-badge";
import { PYQ_ACCEPT, validatePyqFile } from "@/lib/pyq";

const isBusy = (status: string) => status === "pending" || status === "processing";

/** Pending for 2+ minutes means the job never reached a worker (e.g. Redis/Celery was down). */
const STALE_PENDING_MS = 2 * 60 * 1000;
const canRetry = (row: PyqBooklet) =>
  row.status === "failed" ||
  (row.status === "pending" && !!row.created_at && Date.now() - new Date(row.created_at).getTime() > STALE_PENDING_MS);

function bookletNote(row: PyqBooklet): string {
  if (row.status === "completed") {
    const n = row.parts.length;
    return `${n} subject${n === 1 ? "" : "s"} found · ${row.pinecone_vectors} passages indexed`;
  }
  if (row.status === "failed") return row.error_message ? `Failed: ${row.error_message}` : "Processing failed — retry, or upload as PDF";
  if (canRetry(row)) return "Waiting for a worker — is Celery running? Press Retry once it is.";
  return "Splitting by subject and indexing for the AI tutor…";
}

function pages(part: PyqPart): string {
  if (!part.page_start) return "";
  return part.page_end && part.page_end !== part.page_start ? `p. ${part.page_start}–${part.page_end}` : `p. ${part.page_start}`;
}

/**
 * PYQ booklets for a class. The admin uploads one booklet; the worker splits it into one
 * part per subject (Mathematics, Physics, …) so students study and ask the AI per subject.
 */
export function ClassPyqs({ classId }: { classId: string }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const booklets = useQuery({
    queryKey: qk.pyqs(classId),
    queryFn: () => contentApi.pyqs(classId),
    // Poll while a booklet is still being split/indexed so its subjects appear without a refresh.
    refetchInterval: (query) => (query.state.data?.some((r) => isBusy(r.status)) ? 5000 : false)
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.pyqs(classId) });

  const add = useMutation({
    mutationFn: () => contentApi.uploadPyq({ classId, title: title.trim(), file: file as File }),
    onSuccess: async () => {
      feedback.success("Booklet uploaded. It is being split by subject and indexed.");
      setTitle("");
      setFile(null);
      setFileInputKey((k) => k + 1);
      await refresh();
    },
    onError: (err) => feedback.error(err, "Upload failed")
  });
  const remove = useMutation({
    mutationFn: contentApi.deleteResource,
    onSuccess: async () => {
      feedback.success("Booklet deleted.");
      await refresh();
    },
    onError: (err) => feedback.error(err, "Delete failed")
  });
  const retry = useMutation({
    mutationFn: contentApi.retryResource,
    onSuccess: async () => {
      feedback.success("Processing restarted.");
      await refresh();
    },
    onError: (err) => feedback.error(err, "Retry failed")
  });

  const submit = () => {
    const problem = requireText(title, "Title") ?? validatePyqFile(file);
    if (problem) return feedback.error(new Error(problem));
    add.mutate();
  };

  const rows = booklets.data ?? [];

  return (
    <div className="space-y-5">
      <Card padding="p-5" className="space-y-4">
        <div>
          <p className="font-semibold text-ink">Upload a PYQ booklet</p>
          <p className="text-sm text-ink-muted">
            Upload the whole class booklet. It is split by subject automatically (each subject starts with its heading, e.g.
            “PHYSICS · 5 Chapters · 84 Questions”). Word and PowerPoint files are converted to PDF.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Question Bank 2021 – 2026" />
          <FileField label="File" hint="PDF, Word or PowerPoint" accept={PYQ_ACCEPT} inputKey={fileInputKey} file={file} onFile={setFile} />
        </div>
        <Button variant="accent" icon={<Plus size={16} />} loading={add.isPending} onClick={submit}>
          Upload booklet
        </Button>
      </Card>

      {booklets.isLoading && <SkeletonList rows={3} className="h-16" />}
      {booklets.error && <Notice tone="danger">Failed to load PYQs.</Notice>}
      {booklets.data && rows.length === 0 && (
        <EmptyState icon={<FileQuestion size={22} />} title="No PYQs yet" message="Booklets you upload for this class appear here, split by subject." />
      )}
      {rows.map((row) => {
        const href = row.view_pdf_url || row.file_url;
        return (
          <Card key={row.id} padding="p-0" className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-muted text-ink-muted">
                <FileQuestion size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{row.title}</p>
                <p className="truncate text-xs text-ink-muted">
                  {row.resource_type.toUpperCase()}
                  {row.total_pages ? ` · ${row.total_pages} pages` : ""} · {bookletNote(row)}
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
                {canRetry(row) && (
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
                    const ok = await feedback.confirm(
                      `Delete "${row.title}"? This removes the booklet, every subject part, its AI index and students' chats about it.`,
                      { confirmLabel: "Delete", danger: true }
                    );
                    if (ok) remove.mutate(row.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
            {row.parts.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-line bg-surface-muted/40 px-4 py-3">
                {row.parts.map((part) => (
                  <a
                    key={part.id}
                    href={part.view_pdf_url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    title={`${part.pinecone_vectors} passages indexed`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink shadow-sm transition-colors hover:border-line-strong"
                  >
                    {part.subject_name}
                    <span className="text-ink-muted">{pages(part)}</span>
                  </a>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
