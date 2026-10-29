"use client";

import { useEffect, useState } from "react";
import { getSession } from "../lib/auth/session";
import { appApi } from "../lib/api/client";
import { Loader2 } from "lucide-react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.href = "/login";
      return;
    }
    appApi
      .me()
      .then(() => setReady(true))
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-ink-muted" aria-busy="true">
        <Loader2 size={24} className="animate-spin" aria-label="Checking session" />
      </div>
    );
  }
  return <>{children}</>;
}
