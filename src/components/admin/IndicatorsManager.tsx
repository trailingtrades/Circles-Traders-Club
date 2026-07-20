"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Indicator = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { studentGrants: number };
};

export default function IndicatorsManager({ initialIndicators }: { initialIndicators: Indicator[] }) {
  const router = useRouter();
  const [indicators, setIndicators] = useState(initialIndicators);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/indicators");
    if (res.ok) setIndicators((await res.json()).indicators);
    router.refresh();
  }

  function startEdit(i: Indicator) {
    setEditingId(i.id);
    setForm({ name: i.name, description: i.description ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", description: "" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(
        editingId ? `/api/admin/indicators/${editingId}` : "/api/admin/indicators",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(`✗ ${data.error || "Save failed"}`);
        return;
      }
      setNotice(editingId ? "✓ Indicator updated." : "✓ Indicator added — assign it to students from their profile.");
      cancelEdit();
      await refresh();
    } catch {
      setNotice("✗ Network error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(i: Indicator) {
    await fetch(`/api/admin/indicators/${i.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !i.isActive }),
    });
    await refresh();
  }

  async function remove(i: Indicator) {
    if (
      !window.confirm(
        `Delete "${i.name}"? It will disappear from the dashboards of the ${i._count.studentGrants} student(s) who have it.`
      )
    )
      return;
    await fetch(`/api/admin/indicators/${i.id}`, { method: "DELETE" });
    setNotice("✓ Indicator deleted.");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6">
        <h2 className="font-bold text-ink-900 dark:text-white">
          {editingId ? "Edit indicator" : "Add indicator"}
        </h2>
        {notice && <p className="rounded-lg bg-ink-100 px-3 py-2 text-sm dark:bg-ink-800">{notice}</p>}
        <div>
          <label className="label">Indicator name *</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. 5C Trend Rider"
          />
        </div>
        <div>
          <label className="label">Description (shown to the student)</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Intraday trend-following indicator for NIFTY"
          />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Saving…" : editingId ? "Save changes" : "Add indicator"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel</button>
          )}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-xs text-ink-400 uppercase dark:border-ink-700">
              <th className="p-3">Indicator</th>
              <th className="p-3">Granted to</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {indicators.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-ink-400">No indicators yet — add one above.</td></tr>
            ) : (
              indicators.map((i) => (
                <tr key={i.id} className="border-b border-ink-100 last:border-0 dark:border-ink-800">
                  <td className="p-3">
                    <span className="font-semibold text-ink-900 dark:text-white">📈 {i.name}</span>
                    {i.description && <span className="block text-xs text-ink-400">{i.description}</span>}
                  </td>
                  <td className="p-3">{i._count.studentGrants} student{i._count.studentGrants === 1 ? "" : "s"}</td>
                  <td className="p-3">
                    {i.isActive ? (
                      <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">VISIBLE</span>
                    ) : (
                      <span className="badge bg-ink-200 text-ink-600 dark:bg-ink-700 dark:text-ink-300">HIDDEN</span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => startEdit(i)}>Edit</button>{" "}
                    <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => toggleActive(i)}>
                      {i.isActive ? "Hide" : "Show"}
                    </button>{" "}
                    <button className="btn-danger !px-3 !py-1 text-xs" onClick={() => remove(i)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="max-w-2xl text-xs text-ink-400">
        Indicators are display-only entitlements: students see which indicators are included in
        their plan on their dashboard, but nothing is clickable — you deliver the actual
        indicators separately (e.g. TradingView invite). Assign indicators per student from the
        student's profile page.
      </p>
    </div>
  );
}
