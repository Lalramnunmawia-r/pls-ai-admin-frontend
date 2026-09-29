"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { RecordTable } from "../common/record-table";
import { display } from "../common/display";

export function LibraryModule() {
  const queryClient = useQueryClient();
  const [boardId, setBoardId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [sectionNumber, setSectionNumber] = useState("");
  const [editingSubtopicId, setEditingSubtopicId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingSectionNumber, setEditingSectionNumber] = useState("");

  const taxonomy = useQuery({
    queryKey: ["taxonomy-tree"],
    queryFn: () => appApi.taxonomyTree()
  });

  const boards = useMemo(() => taxonomy.data?.boards ?? [], [taxonomy.data?.boards]);
  const classesByBoard = useMemo(() => {
    const index = new Map<string, NonNullable<(typeof boards)[number]["classes"]>>();
    boards.forEach((board) => {
      index.set(board.board_id, board.classes);
    });
    return index;
  }, [boards]);
  const subjectsByClass = useMemo(() => {
    const index = new Map<string, NonNullable<(typeof boards)[number]["classes"][number]["subjects"]>>();
    boards.forEach((board) => {
      board.classes.forEach((classNode) => {
        index.set(classNode.class_id, classNode.subjects);
      });
    });
    return index;
  }, [boards]);

  const selectedBoard = useMemo(() => boards.find((row) => row.board_id === boardId) ?? null, [boards, boardId]);
  const classes = useMemo(() => (boardId ? classesByBoard.get(boardId) ?? [] : []), [boardId, classesByBoard]);
  const selectedClass = classes.find((row) => row.class_id === classId) ?? null;
  const subjects = useMemo(() => (classId ? subjectsByClass.get(classId) ?? [] : []), [classId, subjectsByClass]);
  const selectedSubject = subjects.find((row) => row.subject_id === subjectId) ?? null;
  const chapters = useMemo(() => selectedSubject?.chapters ?? [], [selectedSubject]);

  useEffect(() => {
    if (boardId && !boards.some((board) => board.board_id === boardId)) {
      setBoardId("");
      setClassId("");
      setSubjectId("");
      setChapterId("");
    }
  }, [boardId, boards]);

  useEffect(() => {
    if (classId && !classes.some((row) => row.class_id === classId)) {
      setClassId("");
      setSubjectId("");
      setChapterId("");
    }
  }, [classId, classes]);

  useEffect(() => {
    if (subjectId && !subjects.some((row) => row.subject_id === subjectId)) {
      setSubjectId("");
      setChapterId("");
    }
  }, [subjectId, subjects]);

  useEffect(() => {
    if (chapterId && !chapters.some((row) => row.chapter_id === chapterId)) {
      setChapterId("");
    }
  }, [chapterId, chapters]);

  const subtopicsQuery = useQuery({
    queryKey: ["subject-subtopics", subjectId],
    queryFn: () => appApi.subjectSubtopics(subjectId),
    enabled: Boolean(subjectId)
  });

  useEffect(() => {
    if (!classId || subjectId || subjects.length === 0) return;
    const firstSubjectId = subjects[0].subject_id;
    void queryClient.prefetchQuery({
      queryKey: ["subject-subtopics", firstSubjectId],
      queryFn: () => appApi.subjectSubtopics(firstSubjectId)
    });
  }, [classId, subjectId, subjects, queryClient]);

  const createSubtopic = useMutation({
    mutationFn: appApi.createSubtopic,
    onSuccess: async () => {
      setTitle("");
      setSectionNumber("");
      await queryClient.invalidateQueries({ queryKey: ["subject-subtopics", subjectId] });
      await queryClient.invalidateQueries({ queryKey: ["taxonomy-tree"] });
    }
  });

  const updateSubtopic = useMutation({
    mutationFn: ({ subtopicId, nextTitle, nextSectionNumber }: { subtopicId: string; nextTitle: string; nextSectionNumber: string }) =>
      appApi.updateSubtopic(subtopicId, { title: nextTitle, sectionNumber: nextSectionNumber }),
    onSuccess: async () => {
      setEditingSubtopicId("");
      setEditingTitle("");
      setEditingSectionNumber("");
      await queryClient.invalidateQueries({ queryKey: ["subject-subtopics", subjectId] });
      await queryClient.invalidateQueries({ queryKey: ["taxonomy-tree"] });
    }
  });

  const deleteSubtopic = useMutation({
    mutationFn: appApi.deleteSubtopic,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["subject-subtopics", subjectId] });
      await queryClient.invalidateQueries({ queryKey: ["taxonomy-tree"] });
    }
  });

  const subtopics = subtopicsQuery.data ?? [];
  const groupedByChapter = chapters.map((chapter) => ({
    chapterId: chapter.chapter_id,
    chapterTitle: chapter.chapter_title,
    chapterNumber: chapter.chapter_number,
    items: subtopics.filter((row) => row.chapter_id === chapter.chapter_id)
  }));

  const beginEdit = (row: { subtopic_id: string; subtopic_title?: string; title?: string; section_number?: string | null }) => {
    setEditingSubtopicId(row.subtopic_id);
    setEditingTitle((row.subtopic_title || row.title || "").trim());
    setEditingSectionNumber((row.section_number || "").trim());
  };

  return (
    <ModuleCard title="Library Explorer" description="Manage Board -> Class -> Subject -> Subtopic hierarchy.">
      {taxonomy.isLoading && <p className="text-sm text-slate-600">Loading taxonomy...</p>}
      {taxonomy.error && <p className="text-sm text-red-600">Failed to load taxonomy tree.</p>}
      {taxonomy.data && (
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            <select
              value={boardId}
              onChange={(event) => {
                const next = event.target.value;
                setBoardId(next);
                setClassId("");
                setSubjectId("");
                setChapterId("");
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
                const next = event.target.value;
                setClassId(next);
                setSubjectId("");
                setChapterId("");
              }}
              className="rounded border px-3 py-2 text-sm"
              disabled={!selectedBoard}
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
              onChange={(event) => {
                const next = event.target.value;
                setSubjectId(next);
                setChapterId("");
              }}
              className="rounded border px-3 py-2 text-sm"
              disabled={!selectedClass}
            >
              <option value="">Select Subject</option>
              {subjects.map((row) => (
                <option key={row.subject_id} value={row.subject_id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>

          {selectedSubject && (
            <div className="space-y-3 rounded border bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">Add subtopic</p>
              <div className="grid gap-2 md:grid-cols-4">
                <select
                  value={chapterId}
                  onChange={(event) => setChapterId(event.target.value)}
                  className="rounded border px-3 py-2 text-sm"
                >
                  <option value="">Select chapter</option>
                  {chapters.map((row) => (
                    <option key={row.chapter_id} value={row.chapter_id}>
                      {row.chapter_number}. {row.chapter_title}
                    </option>
                  ))}
                </select>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Subtopic title"
                />
                <input
                  value={sectionNumber}
                  onChange={(event) => setSectionNumber(event.target.value)}
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Section number (optional)"
                />
                <button
                  className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                  disabled={!chapterId || !title.trim() || createSubtopic.isPending}
                  onClick={() =>
                    createSubtopic.mutate({
                      chapterId,
                      title: title.trim(),
                      sectionNumber: sectionNumber.trim(),
                      description: ""
                    })
                  }
                >
                  {createSubtopic.isPending ? "Creating..." : "Create subtopic"}
                </button>
              </div>
            </div>
          )}

          {subtopicsQuery.isLoading && <p className="text-sm text-slate-600">Loading subtopics...</p>}
          {subtopicsQuery.error && <p className="text-sm text-red-600">Failed to load subtopics.</p>}
          {selectedSubject &&
            groupedByChapter.map((group) => (
              <div key={group.chapterId} className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-800">
                  {group.chapterNumber}. {group.chapterTitle}
                </h3>
                <RecordTable
                  rows={group.items}
                  empty="No subtopics in this chapter."
                  columns={[
                    {
                      key: "title",
                      label: "Subtopic",
                      render: (row) =>
                        editingSubtopicId === row.subtopic_id ? (
                          <input
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            className="w-full rounded border px-2 py-1 text-xs"
                          />
                        ) : (
                          display(row.subtopic_title || row.title)
                        )
                    },
                    {
                      key: "section",
                      label: "Section #",
                      render: (row) =>
                        editingSubtopicId === row.subtopic_id ? (
                          <input
                            value={editingSectionNumber}
                            onChange={(event) => setEditingSectionNumber(event.target.value)}
                            className="w-full rounded border px-2 py-1 text-xs"
                          />
                        ) : (
                          display(row.section_number ?? "")
                        )
                    },
                    { key: "depth", label: "Depth", render: (row) => String(row.depth) },
                    {
                      key: "actions",
                      label: "Actions",
                      render: (row) => (
                        <div className="flex gap-2">
                          {editingSubtopicId === row.subtopic_id ? (
                            <>
                              <button
                                className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-60"
                                disabled={!editingTitle.trim() || updateSubtopic.isPending}
                                onClick={() =>
                                  updateSubtopic.mutate({
                                    subtopicId: row.subtopic_id,
                                    nextTitle: editingTitle.trim(),
                                    nextSectionNumber: editingSectionNumber.trim()
                                  })
                                }
                              >
                                Save
                              </button>
                              <button
                                className="rounded bg-slate-200 px-2 py-1 text-xs"
                                onClick={() => {
                                  setEditingSubtopicId("");
                                  setEditingTitle("");
                                  setEditingSectionNumber("");
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => beginEdit(row)}>
                              Edit
                            </button>
                          )}
                          <button
                            className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                            disabled={editingSubtopicId === row.subtopic_id}
                            onClick={() => {
                              if (!window.confirm("Hide this subtopic from learner view?")) return;
                              deleteSubtopic.mutate(row.subtopic_id);
                            }}
                          >
                            Hide
                          </button>
                        </div>
                      )
                    }
                  ]}
                />
              </div>
            ))}
        </div>
      )}
    </ModuleCard>
  );
}
