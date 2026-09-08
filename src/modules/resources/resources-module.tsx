"use client";

import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { JsonView } from "../common/json-view";
import { SimpleTable } from "../common/simple-table";

export function ResourcesModule() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["resources"],
    queryFn: () => appApi.resources("")
  });

  return (
    <ModuleCard title="Resource Manager" description="Review uploaded resources and indexing health.">
      {isLoading && <p className="text-sm text-slate-600">Loading resources...</p>}
      {error && <p className="text-sm text-red-600">Failed to load resources.</p>}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Total resources: {data.data.count}</p>
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
