export const dynamic = "force-dynamic";

import Link from "next/link";
import { logoutAction } from "./_actions/auth";

const navLinks = [
  { href: "/admin",                    label: "Dashboard" },
  { href: "/admin/subdivisions",       label: "Subdivisions" },
  { href: "/admin/properties",         label: "Properties" },
  { href: "/admin/neighborhoods",      label: "Neighborhoods" },
  { href: "/admin/plat-mapping",       label: "Plat Index" },
  { href: "/admin/research-queue",     label: "Research Queue" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-52 shrink-0 bg-surface-raised border-r border-surface-border flex flex-col fixed inset-y-0 left-0 z-10">
        <div className="p-4 border-b border-surface-border">
          <p className="text-xs font-semibold tracking-widest uppercase text-text-muted">Admin</p>
          <p className="text-sm font-bold text-text-primary mt-0.5">Land History</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2 rounded text-sm text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-surface-border space-y-0.5">
          <Link
            href="/"
            className="block px-3 py-2 rounded text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            ← Back to site
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded text-xs text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
            >
              Logout
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 ml-52 p-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
