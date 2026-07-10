"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type StudentRow = {
  id: string;
  fullName: string;
  email: string;
  mobile: string | null;
  status: "ACTIVE" | "DISABLED" | "REVOKED";
  subscriptionStart: string;
  subscriptionEnd: string;
  lastLoginAt: string | null;
  course: { name: string } | null;
};

type ListResponse = { total: number; page: number; perPage: number; students: StudentRow[] };

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "disabled", label: "Disabled" },
  { key: "revoked", label: "Revoked" },
] as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function accessBadge(s: StudentRow) {
  if (s.status === "DISABLED")
    return <span className="badge bg-ink-200 text-ink-600 dark:bg-ink-700 dark:text-ink-300">DISABLED</span>;
  if (s.status === "REVOKED")
    return <span className="badge bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300">REVOKED</span>;
  const end = new Date(s.subscriptionEnd);
  end.setHours(23, 59, 59, 999);
  return end.getTime() >= Date.now() ? (
    <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">ACTIVE</span>
  ) : (
    <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">EXPIRED</span>
  );
}

export default function StudentsTable({ initialStatus = "all" }: { initialStatus?: string }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const perPage = 20;

  const load = useCallback(async (query: string, st: string, pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: st, page: String(pg), perPage: String(perPage) });
      if (query) params.set("q", query);
      const res = await fetch(`/api/admin/students?${params}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("", initialStatus, 1);
  }, [load, initialStatus]);

  function onSearch(value: string) {
    setQ(value);
    setPage(1);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(value, status, 1), 350);
  }

  function onStatus(st: string) {
    setStatus(st);
    setPage(1);
    setSelected(new Set());
    load(q, st, 1);
  }

  function onPage(pg: number) {
    setPage(pg);
    load(q, status, pg);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / perPage)) : 1;
  const allOnPageSelected = useMemo(
    () => !!data?.students.length && data.students.every((s) => selected.has(s.id)),
    [data, selected]
  );

  function toggleAll() {
    if (!data) return;
    const next = new Set(selected);
    if (allOnPageSelected) data.students.forEach((s) => next.delete(s.id));
    else data.students.forEach((s) => next.add(s.id));
    setSelected(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function bulk(action: string) {
    if (selected.size === 0) return;
    let extendDays: number | undefined;
    if (action === "extend") {
      const input = window.prompt("Extend selected subscriptions by how many days?", "30");
      if (!input) return;
      extendDays = parseInt(input, 10);
      if (!Number.isFinite(extendDays) || extendDays < 1) {
        setNotice("Enter a valid number of days.");
        return;
      }
    }
    if (action === "delete" && !window.confirm(`Permanently delete ${selected.size} student(s)? This cannot be undone.`)) {
      return;
    }
    setNotice(null);
    const res = await fetch("/api/admin/students/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: Array.from(selected), extendDays }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNotice(body.error || "Bulk action failed");
      return;
    }
    setNotice(`✓ ${action.replace("_", " ")} completed (${body.affected} affected).`);
    setSelected(new Set());
    load(q, status, page);
  }

  const exportUrl = `/api/admin/students/export?status=${encodeURIComponent(status)}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search name, email or phone…"
          className="input max-w-xs"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onStatus(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                status === t.key
                  ? "bg-brand-500 text-ink-900"
                  : "bg-ink-100 text-ink-500 hover:text-ink-900 dark:bg-ink-800 dark:text-ink-300 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <a href={exportUrl} className="btn-secondary !py-1.5 text-xs">📤 Export CSV</a>
          <Link href="/admin/students/new" className="btn-primary !py-1.5 text-xs">➕ Add student</Link>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-50 px-4 py-2 text-sm dark:bg-brand-500/10">
          <b>{selected.size} selected</b>
          <button className="btn-secondary !py-1 text-xs" onClick={() => bulk("extend")}>⏳ Extend</button>
          <button className="btn-secondary !py-1 text-xs" onClick={() => bulk("disable")}>🚫 Disable</button>
          <button className="btn-secondary !py-1 text-xs" onClick={() => bulk("enable")}>✅ Enable</button>
          <button className="btn-secondary !py-1 text-xs" onClick={() => bulk("force_logout")}>🔌 Force logout</button>
          <button className="btn-danger !py-1 text-xs" onClick={() => bulk("delete")}>🗑️ Delete</button>
          <button className="ml-auto text-xs text-ink-500 underline" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {notice && (
        <p className="mb-4 rounded-lg bg-ink-100 px-3 py-2 text-sm dark:bg-ink-800">{notice}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-xs text-ink-400 uppercase dark:border-ink-700">
              <th className="p-3">
                <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={allOnPageSelected} onChange={toggleAll} />
              </th>
              <th className="p-3">Student</th>
              <th className="p-3">Mobile</th>
              <th className="p-3">Course</th>
              <th className="p-3">Status</th>
              <th className="p-3">Subscription</th>
              <th className="p-3">Last login</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-6 text-center text-ink-400">Loading…</td></tr>
            ) : !data || data.students.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-ink-400">No students found.</td></tr>
            ) : (
              data.students.map((s) => (
                <tr key={s.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/50">
                  <td className="p-3">
                    <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} />
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/students/${s.id}`} className="font-semibold text-ink-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
                      {s.fullName}
                    </Link>
                    <span className="block text-xs text-ink-400">{s.email}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{s.mobile || "—"}</td>
                  <td className="p-3">{s.course?.name || "—"}</td>
                  <td className="p-3">{accessBadge(s)}</td>
                  <td className="p-3 whitespace-nowrap">
                    {fmtDate(s.subscriptionStart)} → <b>{fmtDate(s.subscriptionEnd)}</b>
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs">
                    {s.lastLoginAt
                      ? new Date(s.lastLoginAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                      : "Never"}
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/students/${s.id}`} className="btn-secondary !px-3 !py-1 text-xs">Manage</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > perPage && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500 dark:text-ink-400">
            {data.total} student{data.total === 1 ? "" : "s"} · page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button className="btn-secondary !py-1 text-xs" disabled={page <= 1} onClick={() => onPage(page - 1)}>
              ← Prev
            </button>
            <button className="btn-secondary !py-1 text-xs" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
