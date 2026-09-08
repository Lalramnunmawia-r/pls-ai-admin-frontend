"use client";

import { AppShell } from "../../components/app-shell";
import { RequireAuth } from "../../components/require-auth";
import { LibraryModule } from "../../modules/library/library-module";

export default function LibraryPage() {
  return (
    <RequireAuth>
      <AppShell>
        <LibraryModule />
      </AppShell>
    </RequireAuth>
  );
}
