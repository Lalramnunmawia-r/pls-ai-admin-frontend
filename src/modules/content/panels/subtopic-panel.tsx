"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentApi, qk, type V2Subtopic } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { EditableTitle, ghostButtonClass } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { BlocksTab } from "../tabs/blocks-tab";
import { ResourcesTab } from "../tabs/resources-tab";
import { QuestionsTab } from "../tabs/questions-tab";
import { ReportsTab } from "../tabs/reports-tab";

type TabKey = "content" | "resources" | "questions" | "reports";

export function SubtopicPanel({ subtopic, breadcrumb }: { subtopic: V2Subtopic; breadcrumb: string }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const [tab, setTab] = useState<TabKey>("content");
  const summary = useQuery({ queryKey: qk.subtopicSummary(subtopic.id), queryFn: () => contentApi.subtopicSummary(subtopic.id) });

  const update = useMutation({
    mutationFn: (input: { title?: string; hidden?: boolean }) => contentApi.updateSubtopic(subtopic.id, input),
    onSuccess: async (_, input) => {
      if (input.hidden !== undefined) feedback.success(input.hidden ? "Hidden from students." : "Visible to students again.");
      await queryClient.invalidateQueries({ queryKey: qk.subtopics(subtopic.chapter_id) });
    },
    onError: (err) => feedback.error(err, "Update failed")
  });

  const counts = summary.data;
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {breadcrumb} · Subtopic {subtopic.section_number ?? ""}
          </p>
          <EditableTitle value={subtopic.title} onSave={(title) => update.mutateAsync({ title })} />
          {subtopic.hidden && (
            <span className="mt-1 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-xs uppercase text-slate-600">hidden from students</span>
          )}
        </div>
        <button
          className={ghostButtonClass}
          disabled={update.isPending}
          onClick={async () => {
            if (!subtopic.hidden) {
              const ok = await feedback.confirm(`Hide "${subtopic.title}" from students? Content is kept.`, { confirmLabel: "Hide" });
              if (!ok) return;
            }
            update.mutate({ hidden: !subtopic.hidden });
          }}
        >
          {subtopic.hidden ? "Restore subtopic" : "Hide subtopic"}
        </button>
      </header>

      <Tabs<TabKey>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "content", label: "Content", count: counts?.content_blocks },
          { key: "resources", label: "Resources", count: counts?.resources },
          { key: "questions", label: "Quiz questions", count: counts?.quiz_questions },
          { key: "reports", label: "Reports" }
        ]}
      />

      {tab === "content" && <BlocksTab subtopicId={subtopic.id} />}
      {tab === "resources" && <ResourcesTab chapterId={subtopic.chapter_id} subtopicId={subtopic.id} />}
      {tab === "questions" && <QuestionsTab subtopicId={subtopic.id} />}
      {tab === "reports" && <ReportsTab chapterId={subtopic.chapter_id} subtopicId={subtopic.id} />}
    </div>
  );
}
