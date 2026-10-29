"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, FileText, RotateCw, Sparkles, Trash2, Upload } from "lucide-react";
import { contentApi, MANUAL_TEXTBOOK_PUBLISHER, moveId, qk, type V2Class, type V2Subject } from "@/lib/api/admin-v2";
import { requireText, validatePdfFile } from "@/lib/forms/upload-validation";
import { useFeedback } from "@/components/ui/feedback";
import { EditableTitle, FileField, InlineAdd, TextField } from "@/components/ui/form";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, SectionTitle, SkeletonList, Notice } from "@/components/ui/layout";
import { StatusBadge } from "../../common/status-badge";
import { formatWhen } from "../../common/display";
import type { Selection } from "../selection";

export function SubjectPanel({ cls, subject, onSelect }: { cls: V2Class; subject: V2Subject; onSelect: (next: Selection) => void }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const chapters = useQuery({ queryKey: qk.chapters(subject.id), queryFn: () => contentApi.chapters(subject.id) });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.chapters(subject.id) }),
      queryClient.invalidateQueries({ queryKey: ["v2", "tree"] })
    ]);

  const rename = useMutation({
    mutationFn: (name: string) => contentApi.updateSubject(subject.id, { name }),
    onSuccess: refresh,
    onError: (err) => feedback.error(err, "Rename failed")
  });
  const remove = useMutation({
    mutationFn: () => contentApi.deleteSubject(subject.id),
    onSuccess: async () => {
      feedback.success(`${subject.name} deleted.`);
      await refresh();
      onSelect({ class: cls.id });
    },
    onError: (err) => feedback.error(err, "Delete failed")
  });
  const addChapter = useMutation({
    mutationFn: (title: string) => contentApi.createChapter(subject.id, { title }),
    onSuccess: refresh,
    onError: (err) => feedback.error(err, "Could not add chapter")
  });
  const setActive = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => contentApi.updateChapter(input.id, { is_active: input.active }),
    onSuccess: async (_, input) => {
      feedback.success(input.active ? "Chapter visible to students again." : "Chapter hidden from students.");
      await refresh();
    },
    onError: (err) => feedback.error(err, "Update failed")
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => contentApi.reorderChapters(subject.id, ids),
    onSuccess: (rows) => queryClient.setQueryData(qk.chapters(subject.id), rows),
    onError: (err) => feedback.error(err, "Reorder failed")
  });

  const rows = chapters.data ?? [];
  const ids = rows.map((c) => c.id);

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          eyebrow={`${cls.name} · Subject`}
          title={<EditableTitle value={subject.name} onSave={(name) => rename.mutateAsync(name)} />}
          subtitle={
            <button
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
              title="Use this ID to link the subject from another app (e.g. the PLS backend AI binding)"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(subject.id);
                  feedback.success("Subject ID copied.");
                } catch {
                  feedback.error(new Error(subject.id), "Copy failed");
                }
              }}
            >
              <Copy size={12} /> ID {subject.id.slice(0, 8)}… · copy for app linking
            </button>
          }
          actions={
            <Button
              variant="soft-danger"
              size="sm"
              icon={<Trash2 size={14} />}
              loading={remove.isPending}
              onClick={async () => {
                const ok = await feedback.confirm(`Delete ${subject.name}? Apps linked to this subject will stop showing it.`, {
                  confirmLabel: "Delete",
                  danger: true
                });
                if (ok) remove.mutate();
              }}
            >
              Delete subject
            </Button>
          }
        />

        <SectionTitle trailing={<Badge>{rows.length}</Badge>}>Chapters</SectionTitle>
        {chapters.isLoading && <SkeletonList rows={4} className="h-16" />}
        {chapters.error && <Notice tone="danger">Failed to load chapters.</Notice>}
        {chapters.data && rows.length === 0 && (
          <EmptyState
            icon={<FileText size={22} />}
            title="No chapters yet"
            message="Add one by hand below, or upload the textbook PDF and let AI build the chapters for you."
          />
        )}
        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((ch, index) => (
              <div
                key={ch.id}
                className={`flex items-center gap-3 rounded-card border border-line p-3 pr-4 shadow-card ${ch.is_active ? "bg-surface" : "bg-surface-muted"}`}
              >
                <div className="flex flex-col">
                  <IconButton
                    label="Move up"
                    size={22}
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => {
                      const next = moveId(ids, ch.id, -1);
                      if (next) reorder.mutate(next);
                    }}
                  >
                    <ChevronUp size={14} />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    size={22}
                    disabled={index === rows.length - 1 || reorder.isPending}
                    onClick={() => {
                      const next = moveId(ids, ch.id, 1);
                      if (next) reorder.mutate(next);
                    }}
                  >
                    <ChevronDown size={14} />
                  </IconButton>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-muted text-sm font-semibold tabular-nums text-ink-muted">
                  {ch.chapter_number}
                </span>
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onSelect({ class: cls.id, subject: subject.id, chapter: ch.id })}
                >
                  <p className={`truncate font-semibold hover:text-accent ${ch.is_active ? "text-ink" : "text-ink-subtle"}`}>{ch.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                    <span>
                      {ch.subtopic_count} subtopic{ch.subtopic_count === 1 ? "" : "s"}
                    </span>
                    <span>·</span>
                    <span title={ch.textbook_title}>{ch.is_manual ? "Created manually" : "From PDF"}</span>
                    {!ch.is_active && <Badge>hidden</Badge>}
                  </p>
                </button>
                {ch.textbook_status !== "approved" && <StatusBadge status={ch.textbook_status} />}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ch.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                  disabled={setActive.isPending}
                  onClick={async () => {
                    if (ch.is_active) {
                      const ok = await feedback.confirm(`Hide "${ch.title}" from students? Content is kept.`, { confirmLabel: "Hide" });
                      if (!ok) return;
                    }
                    setActive.mutate({ id: ch.id, active: !ch.is_active });
                  }}
                >
                  {ch.is_active ? "Hide" : "Restore"}
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 max-w-md">
          <InlineAdd
            size="md"
            placeholder="New chapter title"
            autoFocus={false}
            busy={addChapter.isPending}
            onSubmit={(title) => addChapter.mutateAsync(title).catch(() => undefined)}
          />
        </div>
      </div>

      <TextbookSection subjectId={subject.id} onChanged={refresh} />
    </div>
  );
}

/** Upload a whole textbook PDF; AI extracts chapters + subtopics, then an admin approves it. */
function TextbookSection({ subjectId, onChanged }: { subjectId: string; onChanged: () => Promise<unknown> }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const textbooks = useQuery({
    queryKey: qk.textbooks(subjectId),
    queryFn: () => contentApi.textbooks(subjectId),
    refetchInterval: (query) => (query.state.data?.some((t) => t.status === "processing") ? 8000 : false)
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: qk.textbooks(subjectId) });
    await onChanged();
  };
  const upload = useMutation({
    mutationFn: () => contentApi.uploadTextbook(subjectId, title.trim(), file as File),
    onSuccess: async () => {
      feedback.success("Uploaded. AI extraction has started; this can take several minutes.");
      setTitle("");
      setFile(null);
      setInputKey((k) => k + 1);
      await refresh();
    },
    onError: (err) => feedback.error(err, "Upload failed")
  });
  const act = useMutation({
    mutationFn: (input: { id: string; action: "approve" | "reject" | "re-extract" }) =>
      input.action === "approve"
        ? contentApi.approveTextbook(input.id)
        : input.action === "reject"
          ? contentApi.rejectTextbook(input.id)
          : contentApi.reExtractTextbook(input.id),
    onSuccess: async (_, input) => {
      feedback.success(
        input.action === "approve" ? "Approved. Students can see it now." : input.action === "reject" ? "Rejected." : "Re-extraction started."
      );
      await refresh();
    },
    onError: (err) => feedback.error(err, "Action failed")
  });

  const uploaded = (textbooks.data ?? []).filter((t) => t.publisher !== MANUAL_TEXTBOOK_PUBLISHER);

  return (
    <section>
      <SectionTitle>Textbook PDFs</SectionTitle>
      <Card padding="p-5" className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
            <Sparkles size={18} />
          </span>
          <div>
            <p className="font-semibold text-ink">Build chapters with AI</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Upload a textbook and AI creates its chapters, subtopics and content. Review it in the tree, then approve to publish.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. NCERT Science Class 7" />
          <FileField label="PDF" accept=".pdf" inputKey={inputKey} file={file} onFile={setFile} />
        </div>
        <Button
          variant="accent"
          icon={<Upload size={16} />}
          loading={upload.isPending}
          onClick={() => {
            const problem = requireText(title, "Title") ?? validatePdfFile(file);
            if (problem) return feedback.error(new Error(problem));
            upload.mutate();
          }}
        >
          Upload &amp; extract
        </Button>
      </Card>
      {uploaded.length > 0 && (
        <Card padding="p-0" className="mt-3 divide-y divide-line overflow-hidden">
          {uploaded.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <FileText size={18} className="shrink-0 text-ink-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{t.title}</p>
                <p className="text-xs text-ink-muted">
                  {t.total_pages ? `${t.total_pages} pages · ` : ""}uploaded {formatWhen(t.created_at)}
                </p>
              </div>
              <StatusBadge status={t.status} />
              {t.status === "review" && (
                <>
                  <Button size="sm" variant="accent" disabled={act.isPending} onClick={() => act.mutate({ id: t.id, action: "approve" })}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" disabled={act.isPending} onClick={() => act.mutate({ id: t.id, action: "reject" })}>
                    Reject
                  </Button>
                </>
              )}
              {t.status !== "processing" && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RotateCw size={14} />}
                  disabled={act.isPending}
                  onClick={async () => {
                    const ok = await feedback.confirm(`Re-run AI extraction for "${t.title}"? Its current chapters and subtopics are replaced.`, {
                      confirmLabel: "Re-extract",
                      danger: true
                    });
                    if (ok) act.mutate({ id: t.id, action: "re-extract" });
                  }}
                >
                  Re-extract
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
