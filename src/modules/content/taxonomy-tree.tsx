"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Dot, Plus } from "lucide-react";
import { contentApi, qk, type V2Class, type V2Subtopic } from "@/lib/api/admin-v2";
import { useFeedback } from "@/components/ui/feedback";
import { InlineAdd } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/layout";
import type { Selection } from "./selection";

type Props = {
  boardId: string;
  classes: V2Class[];
  selection: Selection;
  onSelect: (next: Selection) => void;
};

const INDENT = 14;

function Caret({ open, onClick, hidden }: { open: boolean; onClick: () => void; hidden?: boolean }) {
  if (hidden) return <Dot size={16} className="shrink-0 opacity-40" aria-hidden />;
  return (
    <button
      aria-label={open ? "Collapse" : "Expand"}
      onClick={onClick}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-subtle hover:bg-surface hover:text-ink"
    >
      {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
    </button>
  );
}

/** Same look as the sidebar nav items: accent-soft when selected. */
function Row({ depth, active, muted, children }: { depth: number; active: boolean; muted?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`group relative flex h-9 items-center gap-1 rounded-control pr-2 text-sm transition-colors ${
        active ? "bg-accent-soft font-medium text-accent" : muted ? "text-ink-subtle hover:bg-surface-muted" : "text-ink/85 hover:bg-surface-muted hover:text-ink"
      }`}
      style={{ paddingLeft: depth * INDENT + 6 }}
    >
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" aria-hidden />}
      {children}
    </div>
  );
}

function AddRow({ depth, children }: { depth: number; children: React.ReactNode }) {
  return (
    <div className="py-1 pr-1" style={{ paddingLeft: depth * INDENT + 26 }}>
      {children}
    </div>
  );
}

function AddLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1 rounded-control px-1.5 text-xs font-semibold text-accent hover:bg-accent-soft"
    >
      <Plus size={13} /> Add {label}
    </button>
  );
}

function useExpanded(selection: Selection) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  // Always reveal the path to the current selection.
  useEffect(() => {
    const path = [selection.class, selection.subject, selection.chapter].filter(Boolean) as string[];
    if (path.length === 0) return;
    setOpen((current) => {
      if (path.every((id) => current.has(id))) return current;
      const next = new Set(current);
      path.forEach((id) => next.add(id));
      return next;
    });
  }, [selection.class, selection.subject, selection.chapter]);
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { isOpen: (id: string) => open.has(id), toggle, expand: (id: string) => setOpen((c) => new Set(c).add(id)) };
}

export function TaxonomyTree({ boardId, classes, selection, onSelect }: Props) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const { isOpen, toggle, expand } = useExpanded(selection);
  const [adding, setAdding] = useState<string | null>(null);

  const createClass = useMutation({
    mutationFn: (name: string) => contentApi.createClass({ board_id: boardId, name }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["v2", "tree"] });
      setAdding(null);
      onSelect({ class: created.id });
    },
    onError: (err) => feedback.error(err, "Could not add class")
  });
  const createSubject = useMutation({
    mutationFn: (input: { classId: string; name: string }) => contentApi.createSubject({ class_id: input.classId, name: input.name }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["v2", "tree"] });
      setAdding(null);
      onSelect({ class: created.class_id, subject: created.id });
    },
    onError: (err) => feedback.error(err, "Could not add subject")
  });

  return (
    <nav aria-label="Content tree" className="space-y-0.5">
      <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Classes</p>
      {classes.length === 0 && <p className="px-2 py-1 text-sm text-ink-muted">No classes yet.</p>}
      {classes.map((cls) => (
        <div key={cls.id}>
          <Row depth={0} active={selection.class === cls.id && !selection.subject}>
            <Caret open={isOpen(cls.id)} onClick={() => toggle(cls.id)} />
            <button
              className="min-w-0 flex-1 truncate text-left font-semibold"
              onClick={() => {
                expand(cls.id);
                onSelect({ class: cls.id });
              }}
            >
              {cls.name}
            </button>
          </Row>
          {isOpen(cls.id) && (
            <>
              {cls.subjects.map((subject) => (
                <div key={subject.id}>
                  <Row depth={1} active={selection.subject === subject.id && !selection.chapter}>
                    <Caret open={isOpen(subject.id)} onClick={() => toggle(subject.id)} />
                    <button
                      className="min-w-0 flex-1 truncate text-left"
                      onClick={() => {
                        expand(subject.id);
                        onSelect({ class: cls.id, subject: subject.id });
                      }}
                    >
                      {subject.name}
                    </button>
                    <Badge>{subject.chapter_count}</Badge>
                  </Row>
                  {isOpen(subject.id) && (
                    <SubjectChapters
                      classId={cls.id}
                      subjectId={subject.id}
                      selection={selection}
                      onSelect={onSelect}
                      isOpen={isOpen}
                      toggle={toggle}
                      expand={expand}
                    />
                  )}
                </div>
              ))}
              <AddRow depth={1}>
                {adding === `subject:${cls.id}` ? (
                  <InlineAdd
                    placeholder="Subject name"
                    busy={createSubject.isPending}
                    onCancel={() => setAdding(null)}
                    onSubmit={(name) => createSubject.mutateAsync({ classId: cls.id, name }).catch(() => undefined)}
                  />
                ) : (
                  <AddLink label="subject" onClick={() => setAdding(`subject:${cls.id}`)} />
                )}
              </AddRow>
            </>
          )}
        </div>
      ))}
      <AddRow depth={0}>
        {adding === "class" ? (
          <InlineAdd
            placeholder="Class name, e.g. Class 9"
            busy={createClass.isPending}
            onCancel={() => setAdding(null)}
            onSubmit={(name) => createClass.mutateAsync(name).catch(() => undefined)}
          />
        ) : (
          <AddLink label="class" onClick={() => setAdding("class")} />
        )}
      </AddRow>
    </nav>
  );
}

function SubjectChapters({
  classId,
  subjectId,
  selection,
  onSelect,
  isOpen,
  toggle,
  expand
}: {
  classId: string;
  subjectId: string;
  selection: Selection;
  onSelect: (next: Selection) => void;
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  expand: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const [adding, setAdding] = useState(false);
  const chapters = useQuery({ queryKey: qk.chapters(subjectId), queryFn: () => contentApi.chapters(subjectId) });
  const create = useMutation({
    mutationFn: (title: string) => contentApi.createChapter(subjectId, { title }),
    onSuccess: async (created) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.chapters(subjectId) }),
        queryClient.invalidateQueries({ queryKey: ["v2", "tree"] })
      ]);
      setAdding(false);
      onSelect({ class: classId, subject: subjectId, chapter: created.id });
    },
    onError: (err) => feedback.error(err, "Could not add chapter")
  });

  if (chapters.isLoading)
    return (
      <div className="space-y-1 py-1" style={{ paddingLeft: 2 * INDENT + 6 }}>
        <Skeleton className="h-7" />
        <Skeleton className="h-7" />
      </div>
    );
  if (chapters.error) return <p className="py-1 text-xs text-danger" style={{ paddingLeft: 2 * INDENT + 26 }}>Failed to load chapters</p>;

  return (
    <>
      {(chapters.data ?? []).map((chapter) => (
        <div key={chapter.id}>
          <Row depth={2} active={selection.chapter === chapter.id && !selection.subtopic} muted={!chapter.is_active}>
            <Caret open={isOpen(chapter.id)} onClick={() => toggle(chapter.id)} hidden={chapter.subtopic_count === 0} />
            <button
              className="min-w-0 flex-1 truncate text-left"
              title={chapter.title}
              onClick={() => {
                expand(chapter.id);
                onSelect({ class: classId, subject: subjectId, chapter: chapter.id });
              }}
            >
              <span className="tabular-nums opacity-60">{chapter.chapter_number}.</span> {chapter.title}
            </button>
            {!chapter.is_active && <Badge>hidden</Badge>}
            {chapter.textbook_status !== "approved" && <Badge tone="warning">{chapter.textbook_status}</Badge>}
          </Row>
          {isOpen(chapter.id) && (
            <ChapterSubtopics path={{ class: classId, subject: subjectId, chapter: chapter.id }} selection={selection} onSelect={onSelect} />
          )}
        </div>
      ))}
      <AddRow depth={2}>
        {adding ? (
          <InlineAdd
            placeholder="Chapter title"
            busy={create.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={(title) => create.mutateAsync(title).catch(() => undefined)}
          />
        ) : (
          <AddLink label="chapter" onClick={() => setAdding(true)} />
        )}
      </AddRow>
    </>
  );
}

function ChapterSubtopics({
  path,
  selection,
  onSelect
}: {
  path: { class: string; subject: string; chapter: string };
  selection: Selection;
  onSelect: (next: Selection) => void;
}) {
  const subtopics = useQuery({ queryKey: qk.subtopics(path.chapter), queryFn: () => contentApi.subtopics(path.chapter) });
  if (subtopics.isLoading)
    return (
      <div className="py-1" style={{ paddingLeft: 3 * INDENT + 6 }}>
        <Skeleton className="h-7" />
      </div>
    );
  if (subtopics.error) return <p className="py-1 text-xs text-danger" style={{ paddingLeft: 3 * INDENT + 26 }}>Failed to load subtopics</p>;

  const renderNodes = (nodes: V2Subtopic[], depth: number): React.ReactNode =>
    nodes.map((node) => (
      <div key={node.id}>
        <Row depth={depth} active={selection.subtopic === node.id} muted={node.hidden}>
          <Dot size={16} className="shrink-0 opacity-40" aria-hidden />
          <button className="min-w-0 flex-1 truncate text-left" title={node.title} onClick={() => onSelect({ ...path, subtopic: node.id })}>
            {node.section_number && <span className="tabular-nums opacity-60">{node.section_number} </span>}
            {node.title}
          </button>
        </Row>
        {node.children.length > 0 && renderNodes(node.children, depth + 1)}
      </div>
    ));

  return <>{renderNodes(subtopics.data ?? [], 3)}</>;
}
