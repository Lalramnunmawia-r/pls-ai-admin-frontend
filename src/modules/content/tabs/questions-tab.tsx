"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentApi, qk, type QuizQuestion } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { dangerButtonClass, ghostButtonClass } from "@/components/ui/form";

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

  if (questions.isLoading) return <p className="text-sm text-slate-500">Loading questions…</p>;
  if (questions.error) return <p className="text-sm text-red-600">Failed to load questions.</p>;
  const rows = questions.data ?? [];
  if (rows.length === 0)
    return (
      <p className="text-sm text-slate-500">
        No quiz questions for this subtopic. Questions are generated from the content after a textbook is approved.
      </p>
    );

  return (
    <ol className="space-y-2">
      {rows.map((q, index) => (
        <li key={q.id} className={`rounded-lg border p-3 text-sm ${q.is_active ? "" : "opacity-60"}`}>
          <div className="flex gap-2">
            <span className="text-slate-400">{index + 1}.</span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="whitespace-pre-wrap">{q.question_text}</p>
              {optionList(q.options).length > 0 && (
                <ul className="list-inside list-disc text-slate-600">
                  {optionList(q.options).map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              )}
              {q.correct_answer && (
                <p className="text-emerald-700">
                  <span className="font-medium">Answer:</span> {q.correct_answer}
                </p>
              )}
              <p className="text-xs text-slate-500">
                {q.question_type.replace("_", " ")} · {q.difficulty} · {q.marks} mark{q.marks === 1 ? "" : "s"} · {q.source.replace("_", " ")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button className={ghostButtonClass} disabled={toggle.isPending} onClick={() => toggle.mutate(q)}>
                {q.is_active ? "Disable" : "Enable"}
              </button>
              <button
                className={dangerButtonClass}
                onClick={async () => {
                  if (await feedback.confirm("Delete this question?", { confirmLabel: "Delete", danger: true })) remove.mutate(q.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
