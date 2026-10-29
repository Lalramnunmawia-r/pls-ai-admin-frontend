"use client";

import { Suspense } from "react";
import { AppShell } from "../../components/app-shell";
import { RequireAuth } from "../../components/require-auth";
import { ContentModule } from "../../modules/content/content-module";

export default function ContentPage() {
  return (
    <RequireAuth>
      <AppShell>
        {/* useSearchParams (selection in the URL) needs a Suspense boundary in the app router. */}
        <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
          <ContentModule />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
