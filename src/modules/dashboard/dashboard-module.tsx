"use client";

import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { JsonView } from "../common/json-view";

export function DashboardModule() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => appApi.jobs()
  });

  return (
    <ModuleCard title="Operations Snapshot" description="Unified ingestion and resource processing status.">
      {isLoading && <p className="text-sm text-slate-600">Loading operations...</p>}
      {error && <p className="text-sm text-red-600">Failed to fetch jobs.</p>}
      {data && <JsonView value={data.data} />}
    </ModuleCard>
  );
}
