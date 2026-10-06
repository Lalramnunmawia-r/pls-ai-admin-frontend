"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import {
  requireText,
  validateChapterOrSection,
  validateHttpUrl
} from "@/lib/forms/upload-validation";
import { ModuleCard } from "../common/module-card";
import { RecordTable } from "../common/record-table";
import { StatusBadge } from "../common/status-badge";
import { display, isRow, text } from "../common/display";

export function ResourcesModule() {
  const queryClient = useQueryClient();
  const [boardId, setBoardId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [fileTitle, setFileTitle] = useState("");
  const [fileLabel, setFileLabel] = useState("reference");
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeLabel, setYoutubeLabel] = useState("video");
  const [youtubeNotes, setYoutubeNotes] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("reference");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["resources"],
    queryFn: () => appApi.resources("")
  });
  const resources = (data?.data.items ?? []).filter(isRow);
  const taxonomy = useQuery({
    queryKey: ["taxonomy-tree"],
    queryFn: () => appApi.taxonomyTree()
  });
  const subjectSubtopics = useQuery({
    queryKey: ["subject-subtopics", subjectId],
    queryFn: () => appApi.subjectSubtopics(subjectId),
    enabled: Boolean(subjectId)
  });

  const boards = useMemo(() => taxonomy.data?.boards ?? [], [taxonomy.data?.boards]);
  const classes = useMemo(() => boards.find((x) => x.board_id === boardId)?.classes ?? [], [boards, boardId]);
  const subjects = useMemo(() => classes.find((x) => x.class_id === classId)?.subjects ?? [], [classes, classId]);
  const chapters = useMemo(() => subjects.find((x) => x.subject_id === subjectId)?.chapters ?? [], [subjects, subjectId]);
  const chapterSubtopics = useMemo(
    () => (subjectSubtopics.data ?? []).filter((row) => row.chapter_id === chapterId),
    [subjectSubtopics.data, chapterId]
  );

  const uploadFileMutation = useMutation({
    mutationFn: appApi.uploadResourceFile,
    onSuccess: async () => {
      setSuccessMessage("File resource upload queued.");
      setErrorMessage("");
      setFileTitle("");
      setFileUpload(null);
      await queryClient.invalidateQueries({ queryKey: ["resources"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err) => {
      setSuccessMessage("");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
    }
  });

  const uploadYoutubeMutation = useMutation({
    mutationFn: appApi.uploadResourceYouTube,
    onSuccess: async () => {
      setSuccessMessage("YouTube resource upload queued.");
      setErrorMessage("");
      setYoutubeTitle("");
      setYoutubeUrl("");
      setYoutubeNotes("");
      await queryClient.invalidateQueries({ queryKey: ["resources"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err) => {
      setSuccessMessage("");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
    }
  });

  const uploadLinkMutation = useMutation({
    mutationFn: appApi.uploadResourceLink,
    onSuccess: async () => {
      setSuccessMessage("External link upload queued.");
      setErrorMessage("");
      setLinkTitle("");
      setLinkUrl("");
      await queryClient.invalidateQueries({ queryKey: ["resources"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err) => {
      setSuccessMessage("");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
    }
  });

  const submitFileUpload = () => {
    setErrorMessage("");
    setSuccessMessage("");
    const contextError = validateChapterOrSection(chapterId, sectionId);
    if (contextError) return setErrorMessage(contextError);
    const titleError = requireText(fileTitle, "File title");
    if (titleError) return setErrorMessage(titleError);
    if (!fileUpload) return setErrorMessage("File is required.");
    uploadFileMutation.mutate({
      chapterId: chapterId || undefined,
      sectionId: sectionId || undefined,
      title: fileTitle.trim(),
      label: fileLabel,
      file: fileUpload
    });
  };

  const submitYouTubeUpload = () => {
    setErrorMessage("");
    setSuccessMessage("");
    const contextError = validateChapterOrSection(chapterId, sectionId);
    if (contextError) return setErrorMessage(contextError);
    const titleError = requireText(youtubeTitle, "YouTube title");
    if (titleError) return setErrorMessage(titleError);
    const urlError = validateHttpUrl(youtubeUrl, "YouTube URL");
    if (urlError) return setErrorMessage(urlError);
    uploadYoutubeMutation.mutate({
      chapterId: chapterId || undefined,
      sectionId: sectionId || undefined,
      title: youtubeTitle.trim(),
      youtubeUrl: youtubeUrl.trim(),
      metadataText: youtubeNotes.trim(),
      label: youtubeLabel
    });
  };

  const submitLinkUpload = () => {
    setErrorMessage("");
    setSuccessMessage("");
    const contextError = validateChapterOrSection(chapterId, sectionId);
    if (contextError) return setErrorMessage(contextError);
    const titleError = requireText(linkTitle, "Link title");
    if (titleError) return setErrorMessage(titleError);
    const urlError = validateHttpUrl(linkUrl, "Link URL");
    if (urlError) return setErrorMessage(urlError);
    uploadLinkMutation.mutate({
      chapterId: chapterId || undefined,
      sectionId: sectionId || undefined,
      title: linkTitle.trim(),
      url: linkUrl.trim(),
      label: linkLabel
    });
  };

  return (
    <ModuleCard title="Resource Manager" description="Review uploaded resources and indexing health.">
      <div className="mb-5 space-y-4 rounded border bg-slate-50 p-3">
        <div className="grid gap-2 md:grid-cols-5">
          <select
            value={boardId}
            onChange={(event) => {
              setBoardId(event.target.value);
              setClassId("");
              setSubjectId("");
              setChapterId("");
              setSectionId("");
            }}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">Select Board</option>
            {boards.map((row) => (
              <option key={row.board_id} value={row.board_id}>
                {row.name}
              </option>
            ))}
          </select>
          <select
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setSubjectId("");
              setChapterId("");
              setSectionId("");
            }}
            className="rounded border px-3 py-2 text-sm"
            disabled={!boardId}
          >
            <option value="">Select Class</option>
            {classes.map((row) => (
              <option key={row.class_id} value={row.class_id}>
                {row.class_name}
              </option>
            ))}
          </select>
          <select
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setChapterId("");
              setSectionId("");
            }}
            className="rounded border px-3 py-2 text-sm"
            disabled={!classId}
          >
            <option value="">Select Subject</option>
            {subjects.map((row) => (
              <option key={row.subject_id} value={row.subject_id}>
                {row.name}
              </option>
            ))}
          </select>
          <select
            value={chapterId}
            onChange={(event) => {
              setChapterId(event.target.value);
              setSectionId("");
            }}
            className="rounded border px-3 py-2 text-sm"
            disabled={!subjectId}
          >
            <option value="">Select Chapter</option>
            {chapters.map((row) => (
              <option key={row.chapter_id} value={row.chapter_id}>
                {row.chapter_number}. {row.chapter_title}
              </option>
            ))}
          </select>
          <select
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            className="rounded border px-3 py-2 text-sm"
            disabled={!chapterId}
          >
            <option value="">Select Section (optional)</option>
            {chapterSubtopics.map((row) => (
              <option key={row.section_id} value={row.section_id}>
                {row.section_number ? `${row.section_number} - ` : ""}
                {row.subtopic_title || row.title}
              </option>
            ))}
          </select>
        </div>

        <section className="grid gap-2 md:grid-cols-4">
          <h3 className="md:col-span-4 text-sm font-semibold text-slate-800">Upload File Resource</h3>
          <input
            value={fileTitle}
            onChange={(event) => setFileTitle(event.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="Title"
          />
          <select value={fileLabel} onChange={(event) => setFileLabel(event.target.value)} className="rounded border px-3 py-2 text-sm">
            <option value="reference">reference</option>
            <option value="practice">practice</option>
            <option value="question_bank">question_bank</option>
            <option value="solution">solution</option>
            <option value="notes">notes</option>
          </select>
          <input
            type="file"
            onChange={(event) => setFileUpload(event.target.files?.[0] ?? null)}
            className="rounded border px-3 py-2 text-sm"
          />
          <button
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            disabled={uploadFileMutation.isPending}
            onClick={submitFileUpload}
          >
            {uploadFileMutation.isPending ? "Uploading..." : "Upload File"}
          </button>
        </section>

        <section className="grid gap-2 md:grid-cols-4">
          <h3 className="md:col-span-4 text-sm font-semibold text-slate-800">Upload YouTube Resource</h3>
          <input
            value={youtubeTitle}
            onChange={(event) => setYoutubeTitle(event.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="Title"
          />
          <input
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="YouTube URL"
          />
          <select
            value={youtubeLabel}
            onChange={(event) => setYoutubeLabel(event.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="video">video</option>
            <option value="reference">reference</option>
            <option value="notes">notes</option>
          </select>
          <button
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            disabled={uploadYoutubeMutation.isPending}
            onClick={submitYouTubeUpload}
          >
            {uploadYoutubeMutation.isPending ? "Uploading..." : "Upload YouTube"}
          </button>
          <input
            value={youtubeNotes}
            onChange={(event) => setYoutubeNotes(event.target.value)}
            className="rounded border px-3 py-2 text-sm md:col-span-4"
            placeholder="Metadata/notes (optional)"
          />
        </section>

        <section className="grid gap-2 md:grid-cols-4">
          <h3 className="md:col-span-4 text-sm font-semibold text-slate-800">Upload External Link Resource</h3>
          <input
            value={linkTitle}
            onChange={(event) => setLinkTitle(event.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="Title"
          />
          <input
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="External URL"
          />
          <select value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} className="rounded border px-3 py-2 text-sm">
            <option value="reference">reference</option>
            <option value="notes">notes</option>
            <option value="video">video</option>
          </select>
          <button
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            disabled={uploadLinkMutation.isPending}
            onClick={submitLinkUpload}
          >
            {uploadLinkMutation.isPending ? "Uploading..." : "Upload Link"}
          </button>
        </section>

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        {successMessage && <p className="text-sm text-emerald-700">{successMessage}</p>}
      </div>

      {isLoading && <p className="text-sm text-slate-600">Loading resources...</p>}
      {error && <p className="text-sm text-red-600">Failed to load resources.</p>}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Total resources: {data.data.count}</p>
          <RecordTable
            rows={resources}
            empty="No resources found."
            columns={[
              { key: "title", label: "Title", render: (row) => display(text(row, "title")) },
              { key: "type", label: "Type", render: (row) => display(text(row, "resource_type")) },
              { key: "label", label: "Label", render: (row) => display(text(row, "label")) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={text(row, "status")} /> }
            ]}
          />
        </div>
      )}
    </ModuleCard>
  );
}
