"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentApi, MANUAL_TEXTBOOK_PUBLISHER, moveId, qk, type V2Class, type V2Subject } from "@/lib/api/admin-v2";
import { requireText, validatePdfFile } from "@/lib/forms/upload-validation";
import { useFeedback } from "@/components/ui/feedback";
import { buttonClass, dangerButtonClass, EditableTitle, Field, ghostButtonClass, InlineAdd, inputClass } from "@/components/ui/form";
import { StatusBadge } from "../../common/status-badge";
import { formatWhen } from "../../common/display";
import type { Selection } from "../selection";

export function SubjectPanel({
  cls,
  subject,
  onSelect
}: {
  cls: V2Class;
  subject: V2Subject;
  onSelect: (next: Selection) => void;
}) {
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{cls.name} · Subject</p>
          <EditableTitle value={subject.name} onSave={(name) => rename.mutateAsync(name)} />
          <button
            className="mt-1 block text-xs text-slate-500 hover:text-slate-900"
            title="Use this ID to link the subject from another app (e.g. PLS backend AI binding)"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(subject.id);
                feedback.success("Subject ID copied.");
              } catch {
                feedback.error(new Error(subject.id), "Copy failed");
              }
            }}
          >
            ID {subject.id.slice(0, 8)}… <span className="underline">copy for app linking</span>
          </button>
        </div>
        <button
          className={dangerButtonClass}
          onClick={async () => {
            const ok = await feedback.confirm(
              `Delete ${subject.name}? Apps linked to this subject will stop showing it.`,
              { confirmLabel: "Delete", danger: true }
            );
            if (ok) remove.mutate();
          }}
        >
          Delete subject
        </button>
      </header>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Chapters</h3>
        {chapters.isLoading && <p className="text-sm text-slate-500">Loading chapters…</p>}
        {chapters.error && <p className="text-sm text-red-600">Failed to load chapters.</p>}
        {chapters.data && rows.length === 0 && (
          <p className="text-sm text-slate-500">No chapters yet. Add one by hand, or upload the textbook PDF below and let AI extract them.</p>
        )}
        {rows.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {rows.map((ch, index) => (
              <li key={ch.id} className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm ${ch.is_active ? "" : "bg-slate-50"}`}>
                <div className="flex flex-col">
                  <button
                    aria-label="Move up"
                    className="text-[10px] leading-none text-slate-400 hover:text-slate-900 disabled:opacity-20"
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => {
                      const next = moveId(ids, ch.id, -1);
                      if (next) reorder.mutate(next);
                    }}
                  >
                    ▲
                  </button>
                  <button
                    aria-label="Move down"
                    className="text-[10px] leading-none text-slate-400 hover:text-slate-900 disabled:opacity-20"
                    disabled={index === rows.length - 1 || reorder.isPending}
                    onClick={() => {
                      const next = moveId(ids, ch.id, 1);
                      if (next) reorder.mutate(next);
                    }}
                  >
                    ▼
                  </button>
                </div>
                <span className="w-6 text-right text-slate-400">{ch.chapter_number}.</span>
                <button
                  className={`min-w-0 flex-1 truncate text-left hover:underline ${ch.is_active ? "" : "text-slate-400"}`}
                  onClick={() => onSelect({ class: cls.id, subject: subject.id, chapter: ch.id })}
                >
                  {ch.title}
                </button>
                <span className="text-xs text-slate-500">{ch.subtopic_count} subtopics</span>
                {!ch.is_manual && <span className="text-xs text-slate-400" title={ch.textbook_title}>from PDF</span>}
                {ch.textbook_status !== "approved" && <StatusBadge status={ch.textbook_status} />}
                <button
                  className={ghostButtonClass}
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
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="max-w-md pt-1">
          <InlineAdd placeholder="New chapter title" autoFocus={false} busy={addChapter.isPending} onSubmit={(title) => addChapter.mutateAsync(title).catch(() => undefined)} />
        </div>
      </section>

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
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Textbook PDFs</h3>
      <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
        <p className="text-xs text-slate-500">
          Upload a textbook and AI builds its chapters, subtopics and content. Review it in the tree, then approve to publish.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. NCERT Science Class 7" />
          </Field>
          <Field label="PDF">
            <input key={inputKey} type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
          </Field>
        </div>
        <button
          className={buttonClass}
          disabled={upload.isPending}
          onClick={() => {
            const problem = requireText(title, "Title") ?? validatePdfFile(file);
            if (problem) return feedback.error(new Error(problem));
            upload.mutate();
          }}
        >
          {upload.isPending ? "Uploading…" : "Upload & extract"}
        </button>
      </div>
      {uploaded.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {uploaded.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{t.title}</div>
                <div className="text-xs text-slate-500">
                  {t.total_pages ? `${t.total_pages} pages · ` : ""}uploaded {formatWhen(t.created_at)}
                </div>
              </div>
              <StatusBadge status={t.status} />
              {t.status === "review" && (
                <>
                  <button className={buttonClass} disabled={act.isPending} onClick={() => act.mutate({ id: t.id, action: "approve" })}>
                    Approve
                  </button>
                  <button className={ghostButtonClass} disabled={act.isPending} onClick={() => act.mutate({ id: t.id, action: "reject" })}>
                    Reject
                  </button>
                </>
              )}
              {t.status !== "processing" && (
                <button
                  className={ghostButtonClass}
                  disabled={act.isPending}
                  onClick={async () => {
                    const ok = await feedback.confirm(
                      `Re-run AI extraction for "${t.title}"? Its current chapters and subtopics are replaced.`,
                      { confirmLabel: "Re-extract", danger: true }
                    );
                    if (ok) act.mutate({ id: t.id, action: "re-extract" });
                  }}
                >
                  Re-extract
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
