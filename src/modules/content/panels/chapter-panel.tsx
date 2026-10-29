"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentApi, qk, type V2Chapter } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { EditableTitle, ghostButtonClass } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge } from "../../common/status-badge";
import type { Selection } from "../selection";
import { SubtopicsTab } from "../tabs/subtopics-tab";
import { ResourcesTab } from "../tabs/resources-tab";
import { HelpersTab, PracticeTab } from "../tabs/chapter-pdfs-tab";
import { ReportsTab } from "../tabs/reports-tab";

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
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">{breadcrumb} · Chapter {chapter.chapter_number}</p>
          <EditableTitle value={chapter.title} onSave={(title) => update.mutateAsync({ title })} />
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{chapter.is_manual ? "Created manually" : `From PDF: ${chapter.textbook_title}`}</span>
            {chapter.textbook_status !== "approved" && <StatusBadge status={chapter.textbook_status} />}
            {!chapter.is_active && <span className="rounded bg-slate-200 px-1.5 py-0.5 uppercase">hidden from students</span>}
          </div>
        </div>
        <button
          className={ghostButtonClass}
          disabled={update.isPending}
          onClick={async () => {
            if (chapter.is_active) {
              const ok = await feedback.confirm(`Hide "${chapter.title}" from students? Content is kept.`, { confirmLabel: "Hide" });
              if (!ok) return;
            }
            update.mutate({ is_active: !chapter.is_active });
          }}
        >
          {chapter.is_active ? "Hide chapter" : "Restore chapter"}
        </button>
      </header>

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

      {tab === "subtopics" && (
        <SubtopicsTab chapterId={chapter.id} onOpen={(id) => onSelect({ ...path, chapter: chapter.id, subtopic: id })} />
      )}
      {tab === "resources" && <ResourcesTab chapterId={chapter.id} />}
      {tab === "practice" && <PracticeTab chapterId={chapter.id} />}
      {tab === "helpers" && <HelpersTab chapterId={chapter.id} />}
      {tab === "reports" && <ReportsTab chapterId={chapter.id} />}
    </div>
  );
}
