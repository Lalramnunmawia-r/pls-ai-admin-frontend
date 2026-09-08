"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearSession, getSession } from "../lib/auth/session";
import { authApi } from "../lib/api/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/library", label: "Library" },
  { href: "/ingestion", label: "Ingestion" },
  { href: "/questions", label: "Question Bank" },
  { href: "/resources", label: "Resources" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const session = getSession();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold">LMS AI Admin</div>
          <div className="text-sm text-slate-600">{session?.user.email ?? "Guest"}</div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4 px-4 py-4">
        <aside className="col-span-12 rounded-lg border bg-white p-3 md:col-span-3">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2 text-sm ${
                  path.startsWith(item.href) ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            className="mt-4 w-full rounded bg-red-600 px-3 py-2 text-sm text-white"
            onClick={async () => {
              await authApi.logout(session?.refreshToken).catch(() => undefined);
              clearSession();
              window.location.href = "/login";
            }}
          >
            Sign Out
          </button>
        </aside>
        <main className="col-span-12 rounded-lg border bg-white p-4 md:col-span-9">{children}</main>
      </div>
    </div>
  );
}
