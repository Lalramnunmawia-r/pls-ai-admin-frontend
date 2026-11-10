"use client";

import { AppShell } from "../../components/app-shell";
import { RequireAuth } from "../../components/require-auth";
import { PyqsModule } from "../../modules/pyqs/pyqs-module";

export default function PyqsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <PyqsModule />
      </AppShell>
    </RequireAuth>
  );
}
