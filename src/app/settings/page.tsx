"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../components/app-shell";
import { RequireAuth } from "../../components/require-auth";
import { appApi } from "../../lib/api/client";

function SettingsModule() {
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => appApi.me()
  });

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Settings</h2>
      <p className="text-sm text-slate-700">
        This UI talks only to lms-ai-microservice. Admin login and content APIs live on the backend.
      </p>
      {isLoading && <p className="text-sm text-slate-600">Loading account...</p>}
      {data && (
        <div className="rounded border bg-slate-50 p-3 text-sm">
          <p>Signed in as: {data.data.user.email}</p>
          <p>Role: {data.data.user.role}</p>
        </div>
      )}
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>API base: `NEXT_PUBLIC_LMS_AI_API_URL` (default http://localhost:8001/api/v1)</li>
        <li>Auth: `/ai-admin/auth/*`</li>
        <li>Content: `/admin/*` with the admin JWT</li>
      </ul>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <SettingsModule />
      </AppShell>
    </RequireAuth>
  );
}
