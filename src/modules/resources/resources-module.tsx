"use client";

import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { RecordTable } from "../common/record-table";
import { StatusBadge } from "../common/status-badge";
import { display, isRow, text } from "../common/display";

export function ResourcesModule() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["resources"],
    queryFn: () => appApi.resources("")
  });
  const resources = (data?.data.items ?? []).filter(isRow);

  return (
    <ModuleCard title="Resource Manager" description="Review uploaded resources and indexing health.">
      {isLoading && <p className="text-sm text-slate-600">Loading resources...</p>}
      {error && <p className="text-sm text-red-600">Failed to load resources.</p>}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Total resources: {data.data.count}</p>
          <RecordTable
            rows={resources}
            empty="No resources found."
            columns={[
              { key: "title", label: "Title", render: (row) => display(text(row, "title")) },
              { key: "type", label: "Type", render: (row) => display(text(row, "resource_type")) },
              { key: "label", label: "Label", render: (row) => display(text(row, "label")) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={text(row, "status")} /> }
            ]}
          />
        </div>
      )}
    </ModuleCard>
  );
}
