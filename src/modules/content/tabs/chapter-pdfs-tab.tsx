"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentApi, qk } from "@/lib/api/admin-v2";
import { validatePdfFile, requireText } from "@/lib/forms/upload-validation";
import { useFeedback } from "@/components/ui/feedback";
import { buttonClass, dangerButtonClass, Field, ghostButtonClass, inputClass } from "@/components/ui/form";
import { StatusBadge } from "../../common/status-badge";

function PdfUploadForm({
  heading,
  hint,
  busy,
  onUpload
}: {
  heading: string;
  hint: string;
  busy: boolean;
  onUpload: (label: string, file: File) => Promise<unknown>;
}) {
  const feedback = useFeedback();
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  return (
    <section className="space-y-3 rounded-lg border bg-slate-50 p-4">
      <div>
        <h3 className="text-sm font-semibold">{heading}</h3>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Label">
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder="e.g. Exercise 3.1" />
        </Field>
        <Field label="PDF">
          <input key={inputKey} type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </Field>
      </div>
      <button
        className={buttonClass}
        disabled={busy}
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
        {busy ? "Uploading…" : "Upload"}
      </button>
    </section>
  );
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

  return (
    <div className="space-y-5">
      <PdfUploadForm
        heading="Upload practice questions"
        hint="A PDF of questions with answers. Students see the questions; the tutor uses the answers."
        busy={upload.isPending}
        onUpload={(label, file) => upload.mutateAsync({ label, file })}
      />
      {sets.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {sets.data?.length === 0 && <p className="text-sm text-slate-500">No practice sets yet.</p>}
      <ul className="divide-y rounded-lg border empty:hidden">
        {(sets.data ?? []).map((set) => (
          <li key={set.id} className="px-3 py-2.5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{set.label}</div>
                <div className="text-xs text-slate-500">
                  {set.item_count} question{set.item_count === 1 ? "" : "s"}
                  {set.error_message && <span className="text-red-600"> · {set.error_message}</span>}
                </div>
              </div>
              <StatusBadge status={set.status} />
              <button className={ghostButtonClass} onClick={() => setOpenSet(openSet === set.id ? null : set.id)}>
                {openSet === set.id ? "Hide" : "View"}
              </button>
              <button
                className={dangerButtonClass}
                onClick={async () => {
                  if (await feedback.confirm(`Delete practice set "${set.label}" and its questions?`, { confirmLabel: "Delete", danger: true }))
                    remove.mutate(set.id);
                }}
              >
                Delete
              </button>
            </div>
            {openSet === set.id && (
              <ol className="mt-2 space-y-2 border-l pl-3">
                {items.isLoading && <li className="text-xs text-slate-500">Loading…</li>}
                {(items.data ?? []).map((item) => (
                  <li key={item.id} className="text-sm">
                    {item.group_label && <div className="text-xs font-medium text-slate-500">{item.group_label}</div>}
                    <p className="whitespace-pre-wrap">{item.question_text}</p>
                    {item.answer_text && <p className="whitespace-pre-wrap text-xs text-emerald-700">{item.answer_text}</p>}
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>
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

  return (
    <div className="space-y-5">
      <PdfUploadForm
        heading="Upload a tutor reference PDF"
        hint="For example the same chapter from another textbook. Only the AI tutor reads it; students don't see it."
        busy={upload.isPending}
        onUpload={(label, file) => upload.mutateAsync({ label, file })}
      />
      {helpers.data?.length === 0 && <p className="text-sm text-slate-500">No reference PDFs yet.</p>}
      <ul className="divide-y rounded-lg border empty:hidden">
        {(helpers.data ?? []).map((h) => (
          <li key={h.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{h.label}</div>
              <div className="text-xs text-slate-500">
                {h.vector_count} indexed chunks
                {h.error_message && <span className="text-red-600"> · {h.error_message}</span>}
              </div>
            </div>
            <StatusBadge status={h.status} />
            {h.pdf_url && (
              <a className={ghostButtonClass} href={h.pdf_url} target="_blank" rel="noreferrer">
                Open
              </a>
            )}
            <button
              className={dangerButtonClass}
              onClick={async () => {
                if (await feedback.confirm(`Delete "${h.label}"?`, { confirmLabel: "Delete", danger: true })) remove.mutate(h.id);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
