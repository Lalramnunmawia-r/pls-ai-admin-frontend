"use client";

import { AppShell } from "../../components/app-shell";
import { RequireAuth } from "../../components/require-auth";
import { IngestionModule } from "../../modules/ingestion/ingestion-module";

export default function IngestionPage() {
  return (
    <RequireAuth>
      <AppShell>
        <IngestionModule />
      </AppShell>
    </RequireAuth>
  );
}
