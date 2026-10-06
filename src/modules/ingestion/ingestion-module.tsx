"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { requireText, validatePdfFile, validateYear } from "@/lib/forms/upload-validation";
import { ModuleCard } from "../common/module-card";
import { RecordTable } from "../common/record-table";
import { StatusBadge } from "../common/status-badge";
import { display, isRow, text, whenField } from "../common/display";

export function IngestionModule() {
  const queryClient = useQueryClient();

  const [boardId, setBoardId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [textbookTitle, setTextbookTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [edition, setEdition] = useState("");
  const [textbookFile, setTextbookFile] = useState<File | null>(null);
  const [textbookError, setTextbookError] = useState("");
  const [textbookSuccess, setTextbookSuccess] = useState("");

  const [examPrepId, setExamPrepId] = useState("");
  const [examPrepYearId, setExamPrepYearId] = useState("");
  const [examPrepSubjectId, setExamPrepSubjectId] = useState("");
  const [examPrepCalendarYear, setExamPrepCalendarYear] = useState("");
  const [examPrepTitle, setExamPrepTitle] = useState("");
  const [examPrepFile, setExamPrepFile] = useState<File | null>(null);
  const [examPrepError, setExamPrepError] = useState("");
  const [examPrepSuccess, setExamPrepSuccess] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["ingestion"],
    queryFn: () => appApi.ingestion("?skip=0&limit=20")
  });
  const textbooks = (data?.data.items ?? []).filter(isRow);
  const taxonomy = useQuery({
    queryKey: ["taxonomy-tree"],
    queryFn: () => appApi.taxonomyTree()
  });
  const examPreps = useQuery({
    queryKey: ["exam-preps"],
    queryFn: () => appApi.examPreps()
  });
  const examPrepYears = useQuery({
    queryKey: ["exam-prep-years", examPrepId],
    queryFn: () => appApi.examPrepYears(examPrepId),
    enabled: Boolean(examPrepId)
  });
  const examPrepSubjects = useQuery({
    queryKey: ["exam-prep-subjects", examPrepId],
    queryFn: () => appApi.examPrepSubjects(examPrepId),
    enabled: Boolean(examPrepId)
  });

  const boards = useMemo(() => taxonomy.data?.boards ?? [], [taxonomy.data?.boards]);
  const classes = useMemo(() => boards.find((x) => x.board_id === boardId)?.classes ?? [], [boards, boardId]);
  const subjects = useMemo(() => classes.find((x) => x.class_id === classId)?.subjects ?? [], [classes, classId]);
  const selectedExamPrepYear = useMemo(
    () => (examPrepYears.data ?? []).find((y) => y.id === examPrepYearId) ?? null,
    [examPrepYears.data, examPrepYearId]
  );
  const examPrepSubjectsFiltered = useMemo(() => {
    const all = examPrepSubjects.data ?? [];
    if (!examPrepYearId) return all;
    return all.filter((s) => !s.exam_prep_year_id || s.exam_prep_year_id === examPrepYearId);
  }, [examPrepSubjects.data, examPrepYearId]);

  const textbookUpload = useMutation({
    mutationFn: appApi.uploadTextbook,
    onSuccess: async () => {
      setTextbookSuccess("Textbook upload queued.");
      setTextbookError("");
      setTextbookTitle("");
      setPublisher("");
      setEdition("");
      setTextbookFile(null);
      await queryClient.invalidateQueries({ queryKey: ["ingestion"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err) => {
      setTextbookSuccess("");
      setTextbookError(err instanceof Error ? err.message : "Upload failed");
    }
  });

  const examPrepUpload = useMutation({
    mutationFn: appApi.uploadExamPrepPaper,
    onSuccess: async () => {
      setExamPrepSuccess("Exam prep upload queued.");
      setExamPrepError("");
      setExamPrepTitle("");
      setExamPrepFile(null);
      await queryClient.invalidateQueries({ queryKey: ["ingestion"] });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err) => {
      setExamPrepSuccess("");
      setExamPrepError(err instanceof Error ? err.message : "Upload failed");
    }
  });

  const submitTextbookUpload = () => {
    setTextbookError("");
    setTextbookSuccess("");
    if (!subjectId) return setTextbookError("Please select Board, Class, and Subject.");
    const titleError = requireText(textbookTitle, "Title");
    if (titleError) return setTextbookError(titleError);
    const fileError = validatePdfFile(textbookFile);
    if (fileError) return setTextbookError(fileError);
    if (!textbookFile) return setTextbookError("PDF file is required.");
    textbookUpload.mutate({
      file: textbookFile,
      title: textbookTitle.trim(),
      subjectId,
      publisher: publisher.trim() || undefined,
      edition: edition.trim() || undefined
    });
  };

  const submitExamPrepUpload = () => {
    setExamPrepError("");
    setExamPrepSuccess("");
    const year = Number(examPrepCalendarYear);
    if (!examPrepId) return setExamPrepError("Exam is required.");
    if (!examPrepYearId) return setExamPrepError("Exam year bucket is required.");
    if (!examPrepSubjectId) return setExamPrepError("Subject is required.");
    const titleError = requireText(examPrepTitle, "Title");
    if (titleError) return setExamPrepError(titleError);
    const fileError = validatePdfFile(examPrepFile);
    if (fileError) return setExamPrepError(fileError);
    const yearError = validateYear(examPrepCalendarYear);
    if (yearError) return setExamPrepError(yearError);
    if (!examPrepFile) return setExamPrepError("PDF file is required.");
    examPrepUpload.mutate({
      file: examPrepFile,
      examPrepId,
      examPrepYearId,
      subjectId: examPrepSubjectId,
      calendarYear: year,
      title: examPrepTitle.trim()
    });
  };

  return (
    <ModuleCard title="Ingestion Queue" description="Track textbook and exam-paper extraction progress.">
      <div className="mb-5 space-y-5 rounded border bg-slate-50 p-3">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">Upload Textbook</h3>
          <div className="grid gap-2 md:grid-cols-3">
            <select
              value={boardId}
              onChange={(event) => {
                setBoardId(event.target.value);
                setClassId("");
                setSubjectId("");
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
              onChange={(event) => setSubjectId(event.target.value)}
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
            <input
              value={textbookTitle}
              onChange={(event) => setTextbookTitle(event.target.value)}
              className="rounded border px-3 py-2 text-sm"
              placeholder="Title"
            />
            <input
              value={publisher}
              onChange={(event) => setPublisher(event.target.value)}
              className="rounded border px-3 py-2 text-sm"
              placeholder="Publisher (optional)"
            />
            <input
              value={edition}
              onChange={(event) => setEdition(event.target.value)}
              className="rounded border px-3 py-2 text-sm"
              placeholder="Edition (optional)"
            />
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => setTextbookFile(event.target.files?.[0] ?? null)}
              className="rounded border px-3 py-2 text-sm md:col-span-2"
            />
            <button
              className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
              disabled={textbookUpload.isPending}
              onClick={submitTextbookUpload}
            >
              {textbookUpload.isPending ? "Uploading..." : "Upload Textbook"}
            </button>
          </div>
          {textbookError && <p className="text-sm text-red-600">{textbookError}</p>}
          {textbookSuccess && <p className="text-sm text-emerald-700">{textbookSuccess}</p>}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">Upload Exam Prep Paper</h3>
          <div className="grid gap-2 md:grid-cols-3">
            <select
              value={examPrepId}
              onChange={(event) => {
                setExamPrepId(event.target.value);
                setExamPrepYearId("");
                setExamPrepSubjectId("");
                setExamPrepCalendarYear("");
              }}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="">Select Exam (JEE/SMATEE/etc.)</option>
              {(examPreps.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <select
              value={examPrepYearId}
              onChange={(event) => {
                const next = event.target.value;
                setExamPrepYearId(next);
                const selectedYear = (examPrepYears.data ?? []).find((x) => x.id === next);
                setExamPrepCalendarYear(selectedYear ? String(selectedYear.calendar_year) : "");
              }}
              className="rounded border px-3 py-2 text-sm"
              disabled={!examPrepId}
            >
              <option value="">Select Year Bucket</option>
              {(examPrepYears.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.calendar_year}
                </option>
              ))}
            </select>
            <select
              value={examPrepSubjectId}
              onChange={(event) => setExamPrepSubjectId(event.target.value)}
              className="rounded border px-3 py-2 text-sm"
              disabled={!examPrepId}
            >
              <option value="">Select Subject</option>
              {examPrepSubjectsFiltered.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <input
              value={examPrepTitle}
              onChange={(event) => setExamPrepTitle(event.target.value)}
              className="rounded border px-3 py-2 text-sm"
              placeholder="Paper title"
            />
            <input
              value={examPrepCalendarYear}
              onChange={(event) => setExamPrepCalendarYear(event.target.value)}
              className="rounded border px-3 py-2 text-sm"
              placeholder={selectedExamPrepYear ? String(selectedExamPrepYear.calendar_year) : "Calendar year"}
            />
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => setExamPrepFile(event.target.files?.[0] ?? null)}
              className="rounded border px-3 py-2 text-sm"
            />
            <button
              className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60 md:col-span-3"
              disabled={examPrepUpload.isPending}
              onClick={submitExamPrepUpload}
            >
              {examPrepUpload.isPending ? "Uploading..." : "Upload Exam Prep Paper"}
            </button>
          </div>
          {examPrepError && <p className="text-sm text-red-600">{examPrepError}</p>}
          {examPrepSuccess && <p className="text-sm text-emerald-700">{examPrepSuccess}</p>}
        </section>
      </div>

      {isLoading && <p className="text-sm text-slate-600">Loading ingestion queue...</p>}
      {error && <p className="text-sm text-red-600">Failed to load ingestion data.</p>}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Total textbooks/papers: {data.data.total}</p>
          <RecordTable
            rows={textbooks}
            empty="No textbooks found."
            columns={[
              { key: "title", label: "Title", render: (row) => display(text(row, "title")) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={text(row, "status")} /> },
              { key: "publisher", label: "Publisher", render: (row) => display(text(row, "publisher")) },
              { key: "edition", label: "Edition", render: (row) => display(text(row, "edition")) },
              { key: "pages", label: "Pages", render: (row) => display(text(row, "total_pages")) },
              { key: "updated", label: "Updated", render: (row) => whenField(row, "updated_at", "created_at") }
            ]}
          />
        </div>
      )}
    </ModuleCard>
  );
}
