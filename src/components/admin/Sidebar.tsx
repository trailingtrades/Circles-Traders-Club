"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/students", label: "Students", icon: "👥" },
  { href: "/admin/students/new", label: "Add Student", icon: "➕" },
  { href: "/admin/students/import", label: "Import CSV", icon: "📥" },
  { href: "/admin/courses", label: "Courses", icon: "🎓" },
  { href: "/admin/materials", label: "Materials", icon: "📚" },
  { href: "/admin/logs", label: "Activity Logs", icon: "🗒️" },
];

export default function Sidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active
                ? "bg-brand-500 text-ink-900"
                : "text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white"
            }`}
          >
            <span>{item.icon}</span> {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3 md:hidden dark:border-ink-700 dark:bg-ink-900">
        <Logo size="text-lg" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="btn-secondary !px-3"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </div>
      {open && (
        <div className="border-b border-ink-200 bg-white p-3 md:hidden dark:border-ink-700 dark:bg-ink-900">
          {links}
          <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3 dark:border-ink-700">
            <span className="text-xs text-ink-500 dark:text-ink-400">{adminName}</span>
            <LogoutButton endpoint="/api/admin/logout" redirectTo="/admin/login" className="btn-secondary !px-3 !py-1 text-xs" />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-ink-200 bg-white p-4 md:flex dark:border-ink-700 dark:bg-ink-900">
        <div className="mb-6 px-2">
          <Logo size="text-lg" />
          <p className="mt-1 text-[10px] font-bold tracking-widest text-ink-400 uppercase">Admin Panel</p>
        </div>
        {links}
        <div className="mt-auto space-y-3 border-t border-ink-200 pt-4 dark:border-ink-700">
          <p className="truncate px-2 text-xs text-ink-500 dark:text-ink-400" title={adminName}>
            👤 {adminName}
          </p>
          <div className="flex items-center gap-2 px-2">
            <ThemeToggle />
            <LogoutButton endpoint="/api/admin/logout" redirectTo="/admin/login" />
          </div>
        </div>
      </aside>
    </>
  );
}
