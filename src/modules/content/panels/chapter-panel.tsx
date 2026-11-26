"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, MessageCircle } from "lucide-react";
import { contentApi, qk, type V2Chapter } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { EditableTitle } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/layout";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge } from "../../common/status-badge";
import type { Selection } from "../selection";
import { SubtopicsTab } from "../tabs/subtopics-tab";
import { ResourcesTab } from "../tabs/resources-tab";
import { HelpersTab, PracticeTab } from "../tabs/chapter-pdfs-tab";
import { ReportsTab } from "../tabs/reports-tab";

// Student tutor app (pls-ai-student-frontend). Review chapters open there only in its test mode.
const STUDENT_APP_URL = (process.env.NEXT_PUBLIC_STUDENT_APP_URL || "http://localhost:3004").replace(/\/+$/, "");

type TabKey = "subtopics" | "resources" | "practice" | "helpers" | "reports";

export function ChapterPanel({
  path,
  chapter,
  breadcrumb,
  onSelect
}: {
  path: { class: string; subject: string };
  chapter: V2Chapter;
  breadcrumb: string;
  onSelect: (next: Selection) => void;
}) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const [tab, setTab] = useState<TabKey>("subtopics");
  const summary = useQuery({ queryKey: qk.chapterSummary(chapter.id), queryFn: () => contentApi.chapterSummary(chapter.id) });

  const update = useMutation({
    mutationFn: (input: { title?: string; is_active?: boolean }) => contentApi.updateChapter(chapter.id, input),
    onSuccess: async (_, input) => {
      if (input.is_active !== undefined) feedback.success(input.is_active ? "Chapter visible to students again." : "Chapter hidden from students.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.chapters(chapter.subject_id) }),
        queryClient.invalidateQueries({ queryKey: ["v2", "tree"] })
      ]);
    },
    onError: (err) => feedback.error(err, "Update failed")
  });

  const counts = summary.data;
  return (
    <div>
      <PageHeader
        eyebrow={`${breadcrumb} · Chapter ${chapter.chapter_number}`}
        title={<EditableTitle value={chapter.title} onSave={(title) => update.mutateAsync({ title })} />}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>{chapter.is_manual ? "Created manually" : `From PDF: ${chapter.textbook_title}`}</span>
            {chapter.textbook_status !== "approved" && <StatusBadge status={chapter.textbook_status} />}
            {!chapter.is_active && <Badge>hidden from students</Badge>}
          </span>
        }
        actions={
          <span className="flex flex-wrap items-center gap-2">
          {chapter.is_active && ["approved", "review"].includes(chapter.textbook_status) ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<MessageCircle size={14} />}
              onClick={() =>
                window.open(
                  `${STUDENT_APP_URL}/learn/${chapter.subject_id}/${chapter.id}?n=${chapter.chapter_number}`,
                  "_blank",
                  "noopener"
                )
              }
            >
              Open in AI tutor
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            icon={chapter.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
            loading={update.isPending}
            onClick={async () => {
              if (chapter.is_active) {
                const ok = await feedback.confirm(`Hide "${chapter.title}" from students? Content is kept.`, { confirmLabel: "Hide" });
                if (!ok) return;
              }
              update.mutate({ is_active: !chapter.is_active });
            }}
          >
            {chapter.is_active ? "Hide chapter" : "Restore chapter"}
          </Button>
          </span>
        }
      />

      <div className="mb-5">
        <Tabs<TabKey>
          active={tab}
          onChange={setTab}
          tabs={[
            { key: "subtopics", label: "Subtopics", count: counts?.subtopics },
            { key: "resources", label: "Resources", count: counts?.resources },
            { key: "practice", label: "Practice questions", count: counts?.practice_sets },
            { key: "helpers", label: "Tutor references", count: counts?.helper_sources },
            { key: "reports", label: "Reports" }
          ]}
        />
      </div>

      {tab === "subtopics" && <SubtopicsTab chapterId={chapter.id} onOpen={(id) => onSelect({ ...path, chapter: chapter.id, subtopic: id })} />}
      {tab === "resources" && <ResourcesTab chapterId={chapter.id} />}
      {tab === "practice" && <PracticeTab chapterId={chapter.id} />}
      {tab === "helpers" && <HelpersTab chapterId={chapter.id} />}
      {tab === "reports" && <ReportsTab chapterId={chapter.id} />}
    </div>
  );
}
