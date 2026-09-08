"use client";

import { AppShell } from "../../components/app-shell";
import { RequireAuth } from "../../components/require-auth";
import { ReportsModule } from "../../modules/reports/reports-module";

export default function ReportsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <ReportsModule />
      </AppShell>
    </RequireAuth>
  );
}
