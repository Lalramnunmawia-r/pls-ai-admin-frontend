"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FolderTree, SearchX } from "lucide-react";
import { contentApi, flattenSubtopics, qk, type V2Class } from "@/lib/api/admin-v2";
import { SelectField } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice, PageContainer, PageHeader, SkeletonList } from "@/components/ui/layout";
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
    <PageContainer className="max-w-screen-2xl">
      <PageHeader title="Content" subtitle="Class → Subject → Chapter → Subtopic, exactly as students browse it." />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <Card padding="p-3" className="shrink-0 lg:sticky lg:top-6 lg:w-80">
          {(tree.data?.boards.length ?? 0) > 1 && (
            <SelectField
              label="Curriculum"
              className="mb-3 px-1 pt-1"
              value={boardId}
              onChange={(e) => select({ board: e.target.value })}
              options={(tree.data?.boards ?? []).map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
          {tree.isLoading && <SkeletonList rows={6} className="h-9" />}
          {tree.error && <Notice tone="danger">Failed to load classes.</Notice>}
          {tree.data && tree.data.boards.length === 0 && (
            <Notice tone="warning">No curriculum (board) exists yet. Ask a super admin to create one.</Notice>
          )}
          {tree.data && boardId && (
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
              <TaxonomyTree boardId={boardId} classes={classes} selection={selection} onSelect={select} />
            </div>
          )}
        </Card>
        <section className="min-w-0 flex-1">
          {tree.data && <SelectedPanel selection={selection} select={select} classes={classes} />}
        </section>
      </div>
    </PageContainer>
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

  if (!selection.class)
    return (
      <EmptyState
        icon={<FolderTree size={22} />}
        title="Pick something to manage"
        message="Choose a class, subject, chapter or subtopic on the left. Everything for it (subtopics, content, resources, questions) is managed here."
      />
    );
  if (!cls) return <Missing what="class" onBack={() => select({})} />;
  if (!selection.subject) return <ClassPanel key={cls.id} cls={cls} onSelect={select} />;
  if (!subject) return <Missing what="subject" onBack={() => select({ class: cls.id })} />;
  if (!selection.chapter) return <SubjectPanel key={subject.id} cls={cls} subject={subject} onSelect={select} />;

  const subjectPath = { class: cls.id, subject: subject.id };
  if (chapters.isLoading) return <SkeletonList rows={4} />;
  if (!chapter) return <Missing what="chapter" onBack={() => select(subjectPath)} />;
  const crumb = `${cls.name} › ${subject.name}`;
  if (!selection.subtopic)
    return <ChapterPanel key={chapter.id} path={subjectPath} chapter={chapter} breadcrumb={crumb} onSelect={select} />;

  if (subtopics.isLoading) return <SkeletonList rows={4} />;
  if (!subtopic) return <Missing what="subtopic" onBack={() => select({ ...subjectPath, chapter: chapter.id })} />;
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        icon={<ArrowLeft size={14} />}
        className="-ml-2"
        onClick={() => select({ ...subjectPath, chapter: chapter.id })}
      >
        {chapter.chapter_number}. {chapter.title}
      </Button>
      <SubtopicPanel key={subtopic.id} subtopic={subtopic} breadcrumb={`${crumb} › Ch ${chapter.chapter_number}`} />
    </div>
  );
}

function Missing({ what, onBack }: { what: string; onBack: () => void }) {
  return (
    <EmptyState
      icon={<SearchX size={22} />}
      title={`This ${what} no longer exists`}
      message="It may have been deleted by someone else."
      action={
        <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={onBack}>
          Go back
        </Button>
      }
    />
  );
}
