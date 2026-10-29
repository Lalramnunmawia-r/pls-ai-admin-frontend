"use client";

// Mirrors lushaiedu_pls_web/components/shell/AppShell.tsx: sidebar on desktop, drawer on mobile.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, FileUp, LayoutDashboard, LogOut, Menu, Settings, X, type LucideIcon } from "lucide-react";
import { clearSession, getSession } from "../lib/auth/session";
import { authApi } from "../lib/api/client";
import { IconButton } from "./ui/button";

type NavLink = { href: string; label: string; icon: LucideIcon };

const sections: { title: string; links: NavLink[] }[] = [
  {
    title: "Overview",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/content", label: "Content", icon: BookOpen }
    ]
  },
  {
    title: "Manage",
    links: [
      // Exam-prep papers still upload here until they get their own subject → chapter → subtopic tab.
      { href: "/ingestion", label: "Exam Prep Uploads", icon: FileUp },
      { href: "/settings", label: "Settings", icon: Settings }
    ]
  }
];

async function signOut() {
  await authApi.logout(getSession()?.refreshToken).catch(() => undefined);
  clearSession();
  window.location.href = "/login";
}

export function Brand({ subtitle = "AI Content Admin" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent text-base font-bold text-white shadow-sm">L</span>
      <div className="leading-tight">
        <p className="text-[15px] font-bold tracking-tight text-ink">
          Lush<span className="text-accent">AI</span>Edu
        </p>
        <p className="text-xs text-ink-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function SideNav({ path }: { path: string }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {sections.map((section, index) => (
        <div key={section.title}>
          <p
            className={`px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle ${index === 0 ? "pt-3" : "pt-6"}`}
          >
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.links.map(({ href, label, icon: Icon }) => {
              const active = path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors ${
                    active ? "bg-accent-soft text-accent" : "text-ink/80 hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" aria-hidden />}
                  <Icon size={18} className={active ? "text-accent" : "text-ink-muted group-hover:text-ink"} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Account() {
  // Read after mount: the session lives in localStorage, which the server render can't see.
  const [email, setEmail] = useState("");
  useEffect(() => setEmail(getSession()?.user.email ?? ""), []);
  return (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 rounded-control px-2.5 py-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
          {email.charAt(0).toUpperCase() || "A"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{email || "Account"}</span>
          <span className="block text-xs text-ink-muted">Administrator</span>
        </span>
        <IconButton label="Sign out" onClick={signOut}>
          <LogOut size={16} />
        </IconButton>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [path]);

  return (
    <div className="min-h-screen bg-canvas md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="px-5 pb-4 pt-5">
          <Brand />
        </div>
        <SideNav path={path} />
        <Account />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur md:hidden">
        <Brand />
        <IconButton label="Open menu" variant="secondary" size={40} onClick={() => setMenuOpen(true)}>
          <Menu size={18} />
        </IconButton>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-[2px] md:hidden" onClick={() => setMenuOpen(false)}>
          <aside
            className="flex h-full w-72 max-w-[85vw] flex-col border-r border-line bg-surface shadow-overlay"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <Brand />
              <IconButton label="Close menu" onClick={() => setMenuOpen(false)}>
                <X size={18} />
              </IconButton>
            </div>
            <SideNav path={path} />
            <Account />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
