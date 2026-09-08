"use client";

import { AppShell } from "../../components/app-shell";
import { RequireAuth } from "../../components/require-auth";
import { ResourcesModule } from "../../modules/resources/resources-module";

export default function ResourcesPage() {
  return (
    <RequireAuth>
      <AppShell>
        <ResourcesModule />
      </AppShell>
    </RequireAuth>
  );
}
