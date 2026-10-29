"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentApi, flattenSubtopics, qk, type Resource } from "@/lib/api/admin-v2";
import { requireText, validateHttpUrl } from "@/lib/forms/upload-validation";
import { useFeedback } from "@/components/ui/feedback";
import { buttonClass, dangerButtonClass, Field, ghostButtonClass, inputClass } from "@/components/ui/form";
import { StatusBadge } from "../../common/status-badge";

type Kind = "file" | "youtube" | "link";

const LABELS: Record<Kind, string[]> = {
  file: ["reference", "notes", "practice", "question_bank", "solution"],
  youtube: ["video", "reference", "notes"],
  link: ["reference", "notes", "video"]
};

const FILE_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx";

function viewUrl(row: Resource): string | null {
  return row.file_url || row.youtube_url || row.external_url;
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

  const resources = useQuery({
    queryKey: qk.resources(chapterId, subtopicId),
    queryFn: () => contentApi.resources(chapterId, subtopicId)
  });
  // Chapter-level view shows which subtopic each resource belongs to.
  const subtopics = useQuery({
    queryKey: qk.subtopics(chapterId),
    queryFn: () => contentApi.subtopics(chapterId),
    enabled: !subtopicId
  });
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
      (kind === "file"
        ? file
          ? null
          : "Choose a file."
        : validateHttpUrl(url, kind === "youtube" ? "YouTube URL" : "URL")) ??
      (kind === "youtube" && !/(youtube\.com|youtu\.be)/i.test(url) ? "That is not a YouTube link." : null);
    if (problem) return feedback.error(new Error(problem));
    add.mutate();
  };

  const rows = resources.data ?? [];

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-lg border bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Add resource {subtopicId ? "to this subtopic" : "to this chapter"}</h3>
          <div className="flex rounded border bg-white p-0.5 text-xs">
            {(["file", "youtube", "link"] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setKind(k);
                  setLabel(LABELS[k][0]);
                }}
                className={`rounded px-2.5 py-1 ${kind === k ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                {k === "file" ? "File" : k === "youtube" ? "YouTube" : "Link"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Worked examples" />
          </Field>
          <Field label="Type">
            <select value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass}>
              {LABELS[kind].map((value) => (
                <option key={value} value={value}>
                  {value.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          {kind === "file" ? (
            <Field label="File" hint="PDF, Word or PowerPoint">
              <input
                key={fileInputKey}
                type="file"
                accept={FILE_ACCEPT}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            </Field>
          ) : (
            <Field label={kind === "youtube" ? "YouTube URL" : "URL"}>
              <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass} placeholder="https://" />
            </Field>
          )}
        </div>
        {kind === "youtube" && (
          <Field label="Notes for the AI tutor (optional)" hint="What the video covers. Helps the tutor recommend it.">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </Field>
        )}
        <button className={buttonClass} onClick={submit} disabled={add.isPending}>
          {add.isPending ? "Adding…" : "Add resource"}
        </button>
      </section>

      {resources.isLoading && <p className="text-sm text-slate-500">Loading resources…</p>}
      {resources.error && <p className="text-sm text-red-600">Failed to load resources.</p>}
      {resources.data && rows.length === 0 && <p className="text-sm text-slate-500">No resources yet.</p>}
      {rows.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => {
            const href = viewUrl(row);
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{row.title}</div>
                  <div className="text-xs text-slate-500">
                    {row.resource_type} · {row.label.replace("_", " ")}
                    {!subtopicId && (
                      <> · {row.section_id ? subtopicTitle.get(row.section_id) ?? "Subtopic" : "Whole chapter"}</>
                    )}
                  </div>
                </div>
                <StatusBadge status={row.status} />
                <div className="flex gap-1.5">
                  {href && (
                    <a href={href} target="_blank" rel="noreferrer" className={ghostButtonClass}>
                      Open
                    </a>
                  )}
                  {row.status === "failed" && (
                    <button className={ghostButtonClass} disabled={retry.isPending} onClick={() => retry.mutate(row.id)}>
                      Retry
                    </button>
                  )}
                  <button
                    className={dangerButtonClass}
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
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
