"use client";

import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/client";
import { ModuleCard } from "../common/module-card";
import { RecordTable } from "../common/record-table";
import { StatusBadge } from "../common/status-badge";
import { display, isRow, text, whenField } from "../common/display";

export function IngestionModule() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ingestion"],
    queryFn: () => appApi.ingestion("?skip=0&limit=20")
  });
  const textbooks = (data?.data.items ?? []).filter(isRow);

  return (
    <ModuleCard title="Ingestion Queue" description="Track textbook and exam-paper extraction progress.">
      {isLoading && <p className="text-sm text-slate-600">Loading ingestion queue...</p>}
      {error && <p className="text-sm text-red-600">Failed to load ingestion data.</p>}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Total textbooks/papers: {data.data.total}</p>
          <RecordTable
            rows={textbooks}
            empty="No textbooks found."
            columns={[
              { key: "title", label: "Title", render: (row) => display(text(row, "title")) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={text(row, "status")} /> },
              { key: "publisher", label: "Publisher", render: (row) => display(text(row, "publisher")) },
              { key: "edition", label: "Edition", render: (row) => display(text(row, "edition")) },
              { key: "pages", label: "Pages", render: (row) => display(text(row, "total_pages")) },
              { key: "updated", label: "Updated", render: (row) => whenField(row, "updated_at", "created_at") }
            ]}
          />
        </div>
      )}
    </ModuleCard>
  );
}
