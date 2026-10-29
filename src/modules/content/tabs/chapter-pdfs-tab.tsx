"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, ChevronDown, ChevronUp, ClipboardList, ExternalLink, Trash2, Upload } from "lucide-react";
import { contentApi, qk } from "@/lib/api/admin-v2";
import { validatePdfFile, requireText } from "@/lib/forms/upload-validation";
import { useFeedback } from "@/components/ui/feedback";
import { FileField, TextField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton, SkeletonList } from "@/components/ui/layout";
import { StatusBadge } from "../../common/status-badge";

function PdfUploadForm({
  heading,
  hint,
  icon,
  busy,
  onUpload
}: {
  heading: string;
  hint: string;
  icon: React.ReactNode;
  busy: boolean;
  onUpload: (label: string, file: File) => Promise<unknown>;
}) {
  const feedback = useFeedback();
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  return (
    <Card padding="p-5" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">{icon}</span>
        <div>
          <p className="font-semibold text-ink">{heading}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Exercise 3.1" />
        <FileField label="PDF" accept=".pdf" inputKey={inputKey} file={file} onFile={setFile} />
      </div>
      <Button
        variant="accent"
        icon={<Upload size={16} />}
        loading={busy}
        onClick={async () => {
          const problem = requireText(label, "Label") ?? validatePdfFile(file);
          if (problem) return feedback.error(new Error(problem));
          try {
            await onUpload(label.trim(), file as File);
            setLabel("");
            setFile(null);
            setInputKey((k) => k + 1);
          } catch {
            // surfaced by the mutation's onError
          }
        }}
      >
        Upload
      </Button>
    </Card>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  return message ? <span className="text-danger"> · {message}</span> : null;
}

/** Practice Q&A PDFs: the AI extracts questions (shown to students) and answers (used by the tutor). */
export function PracticeTab({ chapterId }: { chapterId: string }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const [openSet, setOpenSet] = useState<string | null>(null);
  const sets = useQuery({
    queryKey: qk.practiceSets(chapterId),
    queryFn: () => contentApi.practiceSets(chapterId),
    refetchInterval: (query) => (query.state.data?.some((s) => s.status === "processing") ? 5000 : false)
  });
  const items = useQuery({
    queryKey: qk.practiceItems(openSet ?? ""),
    queryFn: () => contentApi.practiceItems(openSet as string),
    enabled: Boolean(openSet)
  });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.practiceSets(chapterId) }),
      queryClient.invalidateQueries({ queryKey: qk.chapterSummary(chapterId) })
    ]);
  const upload = useMutation({
    mutationFn: (input: { label: string; file: File }) => contentApi.uploadPracticeSet(chapterId, input.label, input.file),
    onSuccess: async () => {
      feedback.success("Uploaded. Questions are being extracted.");
      await refresh();
    },
    onError: (err) => feedback.error(err, "Upload failed")
  });
  const remove = useMutation({
    mutationFn: contentApi.deletePracticeSet,
    onSuccess: refresh,
    onError: (err) => feedback.error(err, "Delete failed")
  });

  const rows = sets.data ?? [];
  return (
    <div className="space-y-5">
      <PdfUploadForm
        heading="Upload practice questions"
        hint="A PDF of questions with answers. Students see the questions; the tutor uses the answers."
        icon={<ClipboardList size={18} />}
        busy={upload.isPending}
        onUpload={(label, file) => upload.mutateAsync({ label, file })}
      />
      {sets.isLoading && <SkeletonList rows={2} className="h-16" />}
      {sets.data && rows.length === 0 && <EmptyState icon={<ClipboardList size={22} />} title="No practice sets yet" />}
      {rows.length > 0 && (
        <Card padding="p-0" className="divide-y divide-line overflow-hidden">
          {rows.map((set) => (
            <div key={set.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{set.label}</p>
                  <p className="text-xs text-ink-muted">
                    {set.item_count} question{set.item_count === 1 ? "" : "s"}
                    <ErrorLine message={set.error_message} />
                  </p>
                </div>
                <StatusBadge status={set.status} />
                <Button
                  size="sm"
                  variant="secondary"
                  icon={openSet === set.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  onClick={() => setOpenSet(openSet === set.id ? null : set.id)}
                >
                  {openSet === set.id ? "Hide" : "View"}
                </Button>
                <Button
                  size="sm"
                  variant="soft-danger"
                  icon={<Trash2 size={14} />}
                  onClick={async () => {
                    if (await feedback.confirm(`Delete practice set "${set.label}" and its questions?`, { confirmLabel: "Delete", danger: true }))
                      remove.mutate(set.id);
                  }}
                >
                  Delete
                </Button>
              </div>
              {openSet === set.id && (
                <ol className="mt-3 space-y-2 rounded-control bg-surface-muted p-3">
                  {items.isLoading && <Skeleton className="h-10 bg-surface" />}
                  {(items.data ?? []).map((item) => (
                    <li key={item.id} className="rounded-control bg-surface p-3 shadow-card">
                      {item.group_label && <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">{item.group_label}</p>}
                      <p className="whitespace-pre-wrap text-ink">{item.question_text}</p>
                      {item.answer_text && <p className="mt-1 whitespace-pre-wrap text-xs text-success">{item.answer_text}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/** Extra reference PDFs for the tutor only (not shown to students). */
export function HelpersTab({ chapterId }: { chapterId: string }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const helpers = useQuery({
    queryKey: qk.helpers(chapterId),
    queryFn: () => contentApi.helpers(chapterId),
    refetchInterval: (query) => (query.state.data?.some((h) => h.status === "processing") ? 5000 : false)
  });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.helpers(chapterId) }),
      queryClient.invalidateQueries({ queryKey: qk.chapterSummary(chapterId) })
    ]);
  const upload = useMutation({
    mutationFn: (input: { label: string; file: File }) => contentApi.uploadHelper(chapterId, input.label, input.file),
    onSuccess: async () => {
      feedback.success("Uploaded. Indexing for the tutor.");
      await refresh();
    },
    onError: (err) => feedback.error(err, "Upload failed")
  });
  const remove = useMutation({
    mutationFn: contentApi.deleteHelper,
    onSuccess: refresh,
    onError: (err) => feedback.error(err, "Delete failed")
  });

  const rows = helpers.data ?? [];
  return (
    <div className="space-y-5">
      <PdfUploadForm
        heading="Upload a tutor reference PDF"
        hint="For example the same chapter from another textbook. Only the AI tutor reads it; students don't see it."
        icon={<BookMarked size={18} />}
        busy={upload.isPending}
        onUpload={(label, file) => upload.mutateAsync({ label, file })}
      />
      {helpers.isLoading && <SkeletonList rows={2} className="h-16" />}
      {helpers.data && rows.length === 0 && <EmptyState icon={<BookMarked size={22} />} title="No reference PDFs yet" />}
      {rows.length > 0 && (
        <Card padding="p-0" className="divide-y divide-line overflow-hidden">
          {rows.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{h.label}</p>
                <p className="text-xs text-ink-muted">
                  {h.vector_count} indexed chunks
                  <ErrorLine message={h.error_message} />
                </p>
              </div>
              <StatusBadge status={h.status} />
              {h.pdf_url && (
                <a
                  href={h.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition-colors hover:border-line-strong hover:bg-surface-muted"
                >
                  <ExternalLink size={14} /> Open
                </a>
              )}
              <Button
                size="sm"
                variant="soft-danger"
                icon={<Trash2 size={14} />}
                onClick={async () => {
                  if (await feedback.confirm(`Delete "${h.label}"?`, { confirmLabel: "Delete", danger: true })) remove.mutate(h.id);
                }}
              >
                Delete
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
