"use client";

import { useQuery } from "@tanstack/react-query";
import { contentApi, flattenSubtopics, qk, type V2Class } from "@/lib/api/admin-v2";
import { inputClass } from "@/components/ui/form";
import { useSelection, type Selection } from "./selection";
import { TaxonomyTree } from "./taxonomy-tree";
import { ClassPanel } from "./panels/class-panel";
import { SubjectPanel } from "./panels/subject-panel";
import { ChapterPanel } from "./panels/chapter-panel";
import { SubtopicPanel } from "./panels/subtopic-panel";

/**
 * Content workspace: pick a node in Class → Subject → Chapter → Subtopic on the left and
 * manage everything belonging to it on the right — the same hierarchy students browse.
 */
export function ContentModule() {
  const { selection, select } = useSelection();
  const tree = useQuery({ queryKey: qk.tree(selection.board), queryFn: () => contentApi.tree(selection.board) });

  const boardId = tree.data?.board_id ?? undefined;
  const classes = tree.data?.classes ?? [];

  return (
    <div className="flex min-h-[70vh] flex-col gap-4 lg:flex-row">
      <aside className="shrink-0 space-y-3 lg:w-72 lg:border-r lg:pr-4">
        {(tree.data?.boards.length ?? 0) > 1 && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">Curriculum</span>
            <select value={boardId} onChange={(e) => select({ board: e.target.value })} className={inputClass}>
              {tree.data?.boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {tree.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {tree.error && <p className="text-sm text-red-600">Failed to load classes.</p>}
        {tree.data && tree.data.boards.length === 0 && (
          <p className="text-sm text-slate-500">No curriculum (board) exists yet. Ask a super admin to create one.</p>
        )}
        {tree.data && boardId && (
          <div className="max-h-[75vh] overflow-y-auto">
            <TaxonomyTree boardId={boardId} classes={classes} selection={selection} onSelect={select} />
          </div>
        )}
      </aside>
      <section className="min-w-0 flex-1">
        {tree.data && <SelectedPanel selection={selection} select={select} classes={classes} />}
      </section>
    </div>
  );
}

function SelectedPanel({
  selection,
  select,
  classes
}: {
  selection: Selection;
  select: (next: Selection) => void;
  classes: V2Class[];
}) {
  const cls = classes.find((c) => c.id === selection.class);
  const subject = cls?.subjects.find((s) => s.id === selection.subject);

  const chapters = useQuery({
    queryKey: qk.chapters(selection.subject ?? ""),
    queryFn: () => contentApi.chapters(selection.subject as string),
    enabled: Boolean(subject && selection.chapter)
  });
  const chapter = chapters.data?.find((c) => c.id === selection.chapter);

  const subtopics = useQuery({
    queryKey: qk.subtopics(selection.chapter ?? ""),
    queryFn: () => contentApi.subtopics(selection.chapter as string),
    enabled: Boolean(chapter && selection.subtopic)
  });
  const subtopic = flattenSubtopics(subtopics.data ?? []).find((s) => s.id === selection.subtopic);

  if (!selection.class) return <EmptyState />;
  if (!cls) return <Missing what="class" onBack={() => select({})} />;
  if (!selection.subject) return <ClassPanel key={cls.id} cls={cls} onSelect={select} />;
  if (!subject) return <Missing what="subject" onBack={() => select({ class: cls.id })} />;
  if (!selection.chapter) return <SubjectPanel key={subject.id} cls={cls} subject={subject} onSelect={select} />;

  const subjectPath = { class: cls.id, subject: subject.id };
  if (chapters.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!chapter) return <Missing what="chapter" onBack={() => select(subjectPath)} />;
  const crumb = `${cls.name} › ${subject.name}`;
  if (!selection.subtopic)
    return <ChapterPanel key={chapter.id} path={subjectPath} chapter={chapter} breadcrumb={crumb} onSelect={select} />;

  if (subtopics.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!subtopic) return <Missing what="subtopic" onBack={() => select({ ...subjectPath, chapter: chapter.id })} />;
  return (
    <div className="space-y-3">
      <button className="text-xs text-slate-500 hover:text-slate-900" onClick={() => select({ ...subjectPath, chapter: chapter.id })}>
        ← {chapter.chapter_number}. {chapter.title}
      </button>
      <SubtopicPanel key={subtopic.id} subtopic={subtopic} breadcrumb={`${crumb} › Ch ${chapter.chapter_number}`} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
      <p className="font-medium text-slate-700">Pick a class, subject, chapter or subtopic on the left.</p>
      <p className="mt-1">Everything for that item (subtopics, content, resources, questions) is managed right here.</p>
    </div>
  );
}

function Missing({ what, onBack }: { what: string; onBack: () => void }) {
  return (
    <div className="space-y-2 text-sm text-slate-500">
      <p>This {what} no longer exists or was deleted.</p>
      <button className="underline" onClick={onBack}>
        Go back
      </button>
    </div>
  );
}
