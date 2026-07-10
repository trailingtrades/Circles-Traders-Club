"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Course = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { students: number; materials: number };
};

export default function CoursesManager({ initialCourses }: { initialCourses: Course[] }) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/courses");
    if (res.ok) setCourses((await res.json()).courses);
    router.refresh();
  }

  function startEdit(c: Course) {
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description ?? "" });
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
      const res = await fetch(editingId ? `/api/admin/courses/${editingId}` : "/api/admin/courses", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(`✗ ${data.error || "Save failed"}`);
        return;
      }
      setNotice(editingId ? "✓ Course updated." : "✓ Course created — now add materials to it.");
      cancelEdit();
      await refresh();
    } catch {
      setNotice("✗ Network error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: Course) {
    if (
      c.isActive &&
      !window.confirm(
        `Deactivate "${c.name}"? Its ${c._count.students} enrolled student(s) will lose access to its materials until it is reactivated.`
      )
    )
      return;
    await fetch(`/api/admin/courses/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    await refresh();
  }

  async function remove(c: Course) {
    if (!window.confirm(`Delete "${c.name}" and its ${c._count.materials} material(s)? This cannot be undone.`))
      return;
    const res = await fetch(`/api/admin/courses/${c.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setNotice(res.ok ? "✓ Course deleted." : `✗ ${data.error || "Delete failed"}`);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6">
        <h2 className="font-bold text-ink-900 dark:text-white">
          {editingId ? "Edit course" : "Create course"}
        </h2>
        {notice && <p className="rounded-lg bg-ink-100 px-3 py-2 text-sm dark:bg-ink-800">{notice}</p>}
        <div>
          <label className="label">Course name *</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Advanced Options Batch 2026"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Shown on the student dashboard"
          />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Saving…" : editingId ? "Save changes" : "Create course"}
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
              <th className="p-3">Course</th>
              <th className="p-3">Students</th>
              <th className="p-3">Materials</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-ink-400">No courses yet — create one above.</td></tr>
            ) : (
              courses.map((c) => (
                <tr key={c.id} className="border-b border-ink-100 last:border-0 dark:border-ink-800">
                  <td className="p-3">
                    <span className="font-semibold text-ink-900 dark:text-white">{c.name}</span>
                    {c.description && <span className="block text-xs text-ink-400">{c.description}</span>}
                  </td>
                  <td className="p-3">{c._count.students}</td>
                  <td className="p-3">
                    {c._count.materials}{" "}
                    <Link href="/admin/materials" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                      manage →
                    </Link>
                  </td>
                  <td className="p-3">
                    {c.isActive ? (
                      <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">ACTIVE</span>
                    ) : (
                      <span className="badge bg-ink-200 text-ink-600 dark:bg-ink-700 dark:text-ink-300">INACTIVE</span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => startEdit(c)}>Edit</button>{" "}
                    <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => toggleActive(c)}>
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>{" "}
                    <button className="btn-danger !px-3 !py-1 text-xs" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="max-w-2xl text-xs text-ink-400">
        How access control works: every material belongs to a course, and every student is enrolled
        in exactly one course (set on the student's profile). Students only ever see the materials
        of their own course — so to give different students different content, create separate
        courses and assign accordingly.
      </p>
    </div>
  );
}
