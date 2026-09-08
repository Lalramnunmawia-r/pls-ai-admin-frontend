"use client";

import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { JsonView } from "../common/json-view";
import { SimpleTable } from "../common/simple-table";

export function IngestionModule() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ingestion"],
    queryFn: () => appApi.ingestion("?skip=0&limit=20")
  });

  return (
    <ModuleCard title="Ingestion Queue" description="Track textbook and exam-paper extraction progress.">
      {isLoading && <p className="text-sm text-slate-600">Loading ingestion queue...</p>}
      {error && <p className="text-sm text-red-600">Failed to load ingestion data.</p>}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Total textbooks/papers: {data.data.total}</p>
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
