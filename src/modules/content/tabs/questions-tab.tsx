"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, HelpCircle, Power, Trash2 } from "lucide-react";
import { contentApi, qk, type QuizQuestion } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice, SkeletonList } from "@/components/ui/layout";

function optionList(options: unknown): string[] {
  if (Array.isArray(options)) return options.map((o) => (typeof o === "string" ? o : JSON.stringify(o)));
  if (options && typeof options === "object") return Object.entries(options).map(([k, v]) => `${k}. ${String(v)}`);
  return [];
}

/** Quiz questions generated for one subtopic. */
export function QuestionsTab({ subtopicId }: { subtopicId: string }) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const questions = useQuery({ queryKey: qk.subtopicQuestions(subtopicId), queryFn: () => contentApi.subtopicQuestions(subtopicId) });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.subtopicQuestions(subtopicId) }),
      queryClient.invalidateQueries({ queryKey: qk.subtopicSummary(subtopicId) })
    ]);

  const toggle = useMutation({
    mutationFn: (q: QuizQuestion) => contentApi.updateQuestion(q.id, { is_active: !q.is_active }),
    onSuccess: refresh,
    onError: (err) => feedback.error(err, "Update failed")
  });
  const remove = useMutation({
    mutationFn: contentApi.deleteQuestion,
    onSuccess: async () => {
      feedback.success("Question deleted.");
      await refresh();
    },
    onError: (err) => feedback.error(err, "Delete failed")
  });

  if (questions.isLoading) return <SkeletonList rows={3} className="h-28" />;
  if (questions.error) return <Notice tone="danger">Failed to load questions.</Notice>;
  const rows = questions.data ?? [];
  if (rows.length === 0)
    return (
      <EmptyState
        icon={<HelpCircle size={22} />}
        title="No quiz questions"
        message="Questions are generated from the content after a textbook is approved."
      />
    );

  return (
    <ol className="space-y-3">
      {rows.map((q, index) => {
        const options = optionList(q.options);
        return (
          <li key={q.id}>
            <Card className={q.is_active ? "" : "opacity-60"}>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold tabular-nums text-ink-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  <p className="whitespace-pre-wrap font-medium text-ink">{q.question_text}</p>
                  {options.length > 0 && (
                    <ul className="space-y-1 text-ink-muted">
                      {options.map((o) => (
                        <li key={o} className="rounded-control bg-surface-muted px-2.5 py-1.5">
                          {o}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.correct_answer && (
                    <p className="flex items-start gap-1.5 text-success">
                      <CircleCheck size={15} className="mt-0.5 shrink-0" />
                      <span>{q.correct_answer}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{q.question_type.replace("_", " ")}</Badge>
                    <Badge>{q.difficulty}</Badge>
                    <Badge>
                      {q.marks} mark{q.marks === 1 ? "" : "s"}
                    </Badge>
                    {!q.is_active && <Badge tone="warning">disabled</Badge>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button size="sm" variant="secondary" icon={<Power size={14} />} disabled={toggle.isPending} onClick={() => toggle.mutate(q)}>
                    {q.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="soft-danger"
                    icon={<Trash2 size={14} />}
                    onClick={async () => {
                      if (await feedback.confirm("Delete this question?", { confirmLabel: "Delete", danger: true })) remove.mutate(q.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
