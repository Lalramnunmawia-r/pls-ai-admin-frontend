"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../components/app-shell";
import { RequireAuth } from "../../components/require-auth";
import { appApi } from "../../lib/api/client";
import { Card, CardHeader } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/layout";
import { Badge } from "../../components/ui/badge";
import { ModuleCard } from "../../modules/common/module-card";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function SettingsModule() {
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => appApi.me()
  });

  return (
    <ModuleCard title="Settings" description="Your account and how this admin connects to the AI service.">
      <div className="grid max-w-3xl gap-4">
        <Card padding="p-5">
          <CardHeader title="Account" subtitle="The admin you are signed in as." />
          <div className="mt-3 divide-y divide-line">
            {isLoading ? (
              <Skeleton className="h-16" />
            ) : (
              data && (
                <>
                  <Row label="Email" value={data.data.user.email} />
                  <Row label="Role" value={<Badge tone="accent">{data.data.user.role.replace("_", " ")}</Badge>} />
                </>
              )
            )}
          </div>
        </Card>
        <Card padding="p-5">
          <CardHeader title="Connection" subtitle="This UI talks only to the AI microservice." />
          <div className="mt-3 divide-y divide-line">
            <Row label="API base" value={<code className="text-xs">{process.env.NEXT_PUBLIC_LMS_AI_API_URL || "http://localhost:8001/api/v1"}</code>} />
            <Row label="Auth" value={<code className="text-xs">/ai-admin/auth/*</code>} />
            <Row label="Content" value={<code className="text-xs">/admin/v2/* (admin JWT)</code>} />
          </div>
        </Card>
      </div>
    </ModuleCard>
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
