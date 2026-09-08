"use client";

import { AppShell } from "../../components/app-shell";
import { RequireAuth } from "../../components/require-auth";
import { DashboardModule } from "../../modules/dashboard/dashboard-module";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <AppShell>
        <DashboardModule />
      </AppShell>
    </RequireAuth>
  );
}
