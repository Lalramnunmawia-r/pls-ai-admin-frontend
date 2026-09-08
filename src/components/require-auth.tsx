"use client";

import { useEffect, useState } from "react";
import { getSession } from "../lib/auth/session";
import { appApi } from "../lib/api/client";

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
    return <p className="text-sm text-slate-600">Checking session...</p>;
  }
  return <>{children}</>;
}
