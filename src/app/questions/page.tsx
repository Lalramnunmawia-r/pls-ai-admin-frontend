"use client";

import { AppShell } from "../../components/app-shell";
import { RequireAuth } from "../../components/require-auth";
import { QuestionsModule } from "../../modules/questions/questions-module";

export default function QuestionsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <QuestionsModule />
      </AppShell>
    </RequireAuth>
  );
}
