"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { JsonView } from "../common/json-view";
import { SimpleTable } from "../common/simple-table";

export function LibraryModule() {
  const [query, setQuery] = useState("?grade_id=");
  const { data, isLoading, error } = useQuery({
    queryKey: ["library", query],
    queryFn: () => appApi.library(query)
  });

  return (
    <ModuleCard title="Library Explorer" description="Browse subject hierarchy for AI-managed content.">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mb-3 w-full rounded border px-3 py-2 text-sm"
        placeholder="?grade_id=<uuid> or ?exam_prep_id=<uuid>"
      />
      {isLoading && <p className="text-sm text-slate-600">Loading subjects...</p>}
      {error && <p className="text-sm text-red-600">Failed to load library data.</p>}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Total subjects: {data.data.count}</p>
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
