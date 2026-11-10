"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileQuestion } from "lucide-react";
import { contentApi, qk } from "@/lib/api/admin-v2";
import { SelectField } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice, PageContainer, PageHeader } from "@/components/ui/layout";
import { ClassPyqs } from "./class-pyqs";

const NONE = "";

/** Board → Class, then upload/manage that class's PYQ booklets (split per subject automatically). */
export function PyqsModule() {
  const [boardId, setBoardId] = useState(NONE);
  const [classId, setClassId] = useState(NONE);

  const tree = useQuery({ queryKey: qk.tree(boardId || undefined), queryFn: () => contentApi.tree(boardId || undefined) });

  const boards = tree.data?.boards ?? [];
  const activeBoard = boardId || tree.data?.board_id || NONE;
  const classes = tree.data?.classes ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="PYQs"
        subtitle="Upload previous-year question booklets per class. They are split by subject; students read them and ask the AI tutor."
      />

      <Card padding="p-5" className="mb-5">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Board"
            value={activeBoard}
            onChange={(e) => {
              setBoardId(e.target.value);
              setClassId(NONE);
            }}
            options={[{ value: NONE, label: "Choose a board" }, ...boards.map((b) => ({ value: b.id, label: b.name }))]}
          />
          <SelectField
            label="Class"
            value={classId}
            disabled={!classes.length}
            onChange={(e) => setClassId(e.target.value)}
            options={[{ value: NONE, label: "Choose a class" }, ...classes.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        {tree.error && <Notice tone="danger">Failed to load boards and classes.</Notice>}
      </Card>

      {classId ? (
        <ClassPyqs key={classId} classId={classId} />
      ) : (
        <EmptyState icon={<FileQuestion size={22} />} title="Pick a class" message="Choose a board and class to manage its PYQ booklets." />
      )}
    </PageContainer>
  );
}
