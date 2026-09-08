"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { JsonView } from "../common/json-view";
import { SimpleTable } from "../common/simple-table";

export function QuestionsModule() {
  const [chapterId, setChapterId] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["questions", chapterId],
    queryFn: () => appApi.questions(chapterId),
    enabled: false
  });

  return (
    <ModuleCard title="Question Bank" description="Load and review chapter practice sets and PYQ assets.">
      <div className="mb-3 flex gap-2">
        <input
          value={chapterId}
          onChange={(event) => setChapterId(event.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Enter chapter UUID"
        />
        <button onClick={() => void refetch()} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
          Load
        </button>
      </div>
      {isLoading && <p className="text-sm text-slate-600">Loading question bank...</p>}
      {error && <p className="text-sm text-red-600">Failed to load questions.</p>}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Chapter: {data.data.chapterId}</p>
          <SimpleTable items={data.data.items} />
          <details>
            <summary className="cursor-pointer text-sm text-slate-700">Raw payload</summary>
            <JsonView value={data.data} />
          </details>
        </div>
      )}
    </ModuleCard>
  );
}
