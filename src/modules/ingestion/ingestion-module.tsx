"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Upload } from "lucide-react";
import { appApi } from "@/lib/api/client";
import { requireText, validatePdfFile, validateYear } from "@/lib/forms/upload-validation";
import { useFeedback } from "@/components/ui/feedback";
import { FileField, SelectField, TextField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice, SectionTitle, SkeletonList } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";
import { ModuleCard } from "../common/module-card";
import { RecordTable } from "../common/record-table";
import { StatusBadge } from "../common/status-badge";
import { display, isRow, text, whenField } from "../common/display";

const placeholder = (label: string) => ({ value: "", label });

function UploadCardHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">{icon}</span>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>
      </div>
    </div>
  );
}

export function IngestionModule() {
  const queryClient = useQueryClient();
  const feedback = useFeedback();

  const [boardId, setBoardId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [textbookTitle, setTextbookTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [edition, setEdition] = useState("");
  const [textbookFile, setTextbookFile] = useState<File | null>(null);
  const [textbookInputKey, setTextbookInputKey] = useState(0);

  const [examPrepId, setExamPrepId] = useState("");
  const [examPrepYearId, setExamPrepYearId] = useState("");
  const [examPrepSubjectId, setExamPrepSubjectId] = useState("");
  const [examPrepCalendarYear, setExamPrepCalendarYear] = useState("");
  const [examPrepTitle, setExamPrepTitle] = useState("");
  const [examPrepFile, setExamPrepFile] = useState<File | null>(null);
  const [examPrepInputKey, setExamPrepInputKey] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ingestion"],
    queryFn: () => appApi.ingestion("?skip=0&limit=20")
  });
  const textbooks = (data?.data.items ?? []).filter(isRow);
  const taxonomy = useQuery({ queryKey: ["taxonomy-tree"], queryFn: () => appApi.taxonomyTree() });
  const examPreps = useQuery({ queryKey: ["exam-preps"], queryFn: () => appApi.examPreps() });
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

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["ingestion"] });
    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  const textbookUpload = useMutation({
    mutationFn: appApi.uploadTextbook,
    onSuccess: async () => {
      feedback.success("Textbook upload queued.");
      setTextbookTitle("");
      setPublisher("");
      setEdition("");
      setTextbookFile(null);
      setTextbookInputKey((k) => k + 1);
      await refresh();
    },
    onError: (err) => feedback.error(err, "Upload failed")
  });

  const examPrepUpload = useMutation({
    mutationFn: appApi.uploadExamPrepPaper,
    onSuccess: async () => {
      feedback.success("Exam prep upload queued.");
      setExamPrepTitle("");
      setExamPrepFile(null);
      setExamPrepInputKey((k) => k + 1);
      await refresh();
    },
    onError: (err) => feedback.error(err, "Upload failed")
  });

  const fail = (message: string) => feedback.error(new Error(message));

  const submitTextbookUpload = () => {
    if (!subjectId) return fail("Please select Board, Class, and Subject.");
    const problem = requireText(textbookTitle, "Title") ?? validatePdfFile(textbookFile);
    if (problem || !textbookFile) return fail(problem ?? "PDF file is required.");
    textbookUpload.mutate({
      file: textbookFile,
      title: textbookTitle.trim(),
      subjectId,
      publisher: publisher.trim() || undefined,
      edition: edition.trim() || undefined
    });
  };

  const submitExamPrepUpload = () => {
    if (!examPrepId) return fail("Exam is required.");
    if (!examPrepYearId) return fail("Exam year bucket is required.");
    if (!examPrepSubjectId) return fail("Subject is required.");
    const problem = requireText(examPrepTitle, "Title") ?? validatePdfFile(examPrepFile) ?? validateYear(examPrepCalendarYear);
    if (problem || !examPrepFile) return fail(problem ?? "PDF file is required.");
    examPrepUpload.mutate({
      file: examPrepFile,
      examPrepId,
      examPrepYearId,
      subjectId: examPrepSubjectId,
      calendarYear: Number(examPrepCalendarYear),
      title: examPrepTitle.trim()
    });
  };

  return (
    <ModuleCard title="Exam Prep Uploads" description="Upload past exam papers and track textbook and paper extraction.">
      <div className="mb-8 grid gap-5 xl:grid-cols-2">
        <Card padding="p-5" className="space-y-4">
          <UploadCardHeader
            icon={<GraduationCap size={18} />}
            title="Upload exam prep paper"
            subtitle="Past papers for JEE, SMATEE and other exams. AI extracts each question."
          />
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField
              label="Exam"
              value={examPrepId}
              onChange={(event) => {
                setExamPrepId(event.target.value);
                setExamPrepYearId("");
                setExamPrepSubjectId("");
                setExamPrepCalendarYear("");
              }}
              options={[placeholder("Select exam"), ...(examPreps.data ?? []).map((row) => ({ value: row.id, label: row.name }))]}
            />
            <SelectField
              label="Year bucket"
              value={examPrepYearId}
              disabled={!examPrepId}
              onChange={(event) => {
                const next = event.target.value;
                setExamPrepYearId(next);
                const selectedYear = (examPrepYears.data ?? []).find((x) => x.id === next);
                setExamPrepCalendarYear(selectedYear ? String(selectedYear.calendar_year) : "");
              }}
              options={[
                placeholder("Select year"),
                ...(examPrepYears.data ?? []).map((row) => ({ value: row.id, label: String(row.calendar_year) }))
              ]}
            />
            <SelectField
              label="Subject"
              value={examPrepSubjectId}
              disabled={!examPrepId}
              onChange={(event) => setExamPrepSubjectId(event.target.value)}
              options={[placeholder("Select subject"), ...examPrepSubjectsFiltered.map((row) => ({ value: row.id, label: row.name }))]}
            />
            <TextField label="Paper title" className="md:col-span-2" value={examPrepTitle} onChange={(event) => setExamPrepTitle(event.target.value)} />
            <TextField
              label="Calendar year"
              value={examPrepCalendarYear}
              onChange={(event) => setExamPrepCalendarYear(event.target.value)}
              placeholder={selectedExamPrepYear ? String(selectedExamPrepYear.calendar_year) : "e.g. 2024"}
            />
          </div>
          <FileField label="PDF" accept=".pdf,application/pdf" inputKey={examPrepInputKey} file={examPrepFile} onFile={setExamPrepFile} />
          <Button variant="accent" icon={<Upload size={16} />} loading={examPrepUpload.isPending} onClick={submitExamPrepUpload}>
            Upload paper
          </Button>
        </Card>

        <Card padding="p-5" className="space-y-4">
          <UploadCardHeader
            icon={<BookOpen size={18} />}
            title="Upload textbook"
            subtitle="Tip: you can also do this from a subject in Content, without picking the class again."
          />
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField
              label="Board"
              value={boardId}
              onChange={(event) => {
                setBoardId(event.target.value);
                setClassId("");
                setSubjectId("");
              }}
              options={[placeholder("Select board"), ...boards.map((row) => ({ value: row.board_id, label: row.name }))]}
            />
            <SelectField
              label="Class"
              value={classId}
              disabled={!boardId}
              onChange={(event) => {
                setClassId(event.target.value);
                setSubjectId("");
              }}
              options={[placeholder("Select class"), ...classes.map((row) => ({ value: row.class_id, label: row.class_name }))]}
            />
            <SelectField
              label="Subject"
              value={subjectId}
              disabled={!classId}
              onChange={(event) => setSubjectId(event.target.value)}
              options={[placeholder("Select subject"), ...subjects.map((row) => ({ value: row.subject_id, label: row.name }))]}
            />
            <TextField label="Title" value={textbookTitle} onChange={(event) => setTextbookTitle(event.target.value)} />
            <TextField label="Publisher (optional)" value={publisher} onChange={(event) => setPublisher(event.target.value)} />
            <TextField label="Edition (optional)" value={edition} onChange={(event) => setEdition(event.target.value)} />
          </div>
          <FileField label="PDF" accept=".pdf,application/pdf" inputKey={textbookInputKey} file={textbookFile} onFile={setTextbookFile} />
          <Button variant="accent" icon={<Upload size={16} />} loading={textbookUpload.isPending} onClick={submitTextbookUpload}>
            Upload textbook
          </Button>
        </Card>
      </div>

      <SectionTitle trailing={data ? <Badge>{data.data.total}</Badge> : undefined}>Textbooks and papers</SectionTitle>
      {isLoading && <SkeletonList rows={4} className="h-12" />}
      {error && <Notice tone="danger">Failed to load ingestion data.</Notice>}
      {data && (
        <RecordTable
          rows={textbooks}
          empty="No textbooks found."
          rowKey={(row, i) => text(row, "id") || String(i)}
          columns={[
            { key: "title", label: "Title", render: (row) => <span className="font-medium">{display(text(row, "title"))}</span> },
            { key: "hierarchy", label: "Hierarchy", render: (row) => display(text(row, "hierarchy_path")) },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={text(row, "status")} /> },
            { key: "publisher", label: "Publisher", render: (row) => display(text(row, "publisher")) },
            { key: "pages", label: "Pages", render: (row) => display(text(row, "total_pages")) },
            { key: "updated", label: "Updated", render: (row) => whenField(row, "updated_at", "created_at") }
          ]}
        />
      )}
    </ModuleCard>
  );
}
