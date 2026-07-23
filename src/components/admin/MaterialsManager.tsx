"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Material = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  type: "HTML" | "VIDEO" | "SHEET" | "LINK";
  contentPath: string | null;
  url: string | null;
  sortOrder: number;
  isActive: boolean;
  hasHtmlContent?: boolean;
};

const TYPE_META: Record<Material["type"], { icon: string; label: string; hint: string }> = {
  HTML: { icon: "📖", label: "HTML study file", hint: "Upload a .html file — it is stored securely and served only to authorised students." },
  VIDEO: { icon: "🎥", label: "Recorded lecture", hint: "YouTube or Vimeo link, e.g. https://youtu.be/XXXX or https://vimeo.com/123456" },
  SHEET: { icon: "📊", label: "Google Sheet", hint: "Google Sheets share link (set the sheet to: Anyone with the link → Viewer)" },
  LINK: { icon: "🔗", label: "External link", hint: "Any https:// resource — opens in a new tab" },
};

const EMPTY = {
  title: "",
  description: "",
  type: "VIDEO" as Material["type"],
  contentPath: "",
  url: "",
  sortOrder: 0,
  isActive: true,
};

export default function MaterialsManager({
  courses,
  initialMaterials,
}: {
  courses: { id: string; name: string }[];
  initialMaterials: Material[];
}) {
  const router = useRouter();
  const [materials, setMaterials] = useState(initialMaterials);
  const [form, setForm] = useState({ ...EMPTY, courseId: courses[0]?.id ?? "" });
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<Material["type"] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/materials");
    if (res.ok) setMaterials((await res.json()).materials);
    router.refresh();
  }

  function startEdit(m: Material) {
    setEditingId(m.id);
    setEditingType(m.type);
    setFile(null);
    setForm({
      courseId: m.courseId,
      title: m.title,
      description: m.description ?? "",
      type: m.type,
      contentPath: m.contentPath ?? "",
      url: m.url ?? "",
      sortOrder: m.sortOrder,
      isActive: m.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingType(null);
    setFile(null);
    setForm({ ...EMPTY, courseId: courses[0]?.id ?? "" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const isHtml = form.type === "HTML";
      let res: Response;

      if (isHtml) {
        // HTML materials are uploaded as a file (stored in the DB).
        if (!editingId && !file) {
          setNotice("✗ Choose an .html file to upload");
          setBusy(false);
          return;
        }
        const fd = new FormData();
        fd.append("courseId", form.courseId);
        fd.append("title", form.title);
        fd.append("description", form.description);
        fd.append("sortOrder", String(form.sortOrder));
        if (file) fd.append("file", file);
        res = await fetch(
          editingId ? `/api/admin/materials/${editingId}` : "/api/admin/materials",
          { method: editingId ? "PUT" : "POST", body: fd }
        );
      } else {
        res = await fetch(
          editingId ? `/api/admin/materials/${editingId}` : "/api/admin/materials",
          {
            method: editingId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          }
        );
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(`✗ ${data.error || "Save failed"}`);
        return;
      }
      setNotice(editingId ? "✓ Material updated." : "✓ Material added.");
      cancelEdit();
      await refresh();
    } catch {
      setNotice("✗ Network error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(m: Material) {
    await fetch(`/api/admin/materials/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !m.isActive }),
    });
    await refresh();
  }

  async function move(m: Material, dir: -1 | 1) {
    const siblings = materials
      .filter((x) => x.courseId === m.courseId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    const idx = siblings.findIndex((x) => x.id === m.id);
    const swap = siblings[idx + dir];
    if (!swap) return;
    await Promise.all([
      fetch(`/api/admin/materials/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: idx + dir }),
      }),
      fetch(`/api/admin/materials/${swap.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: idx }),
      }),
    ]);
    await refresh();
  }

  async function remove(m: Material) {
    if (!window.confirm(`Delete "${m.title}"? Students will lose access to it immediately.`)) return;
    await fetch(`/api/admin/materials/${m.id}`, { method: "DELETE" });
    setNotice("✓ Material deleted.");
    await refresh();
  }

  const meta = TYPE_META[form.type];

  return (
    <div className="space-y-6">
      {/* Add / edit form */}
      <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6">
        <h2 className="font-bold text-ink-900 dark:text-white">
          {editingId ? "Edit material" : "Add material"}
        </h2>
        {notice && <p className="rounded-lg bg-ink-100 px-3 py-2 text-sm dark:bg-ink-800">{notice}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Course</label>
            <select
              className="input"
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              disabled={!!editingId}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              disabled={!!editingId}
              onChange={(e) => {
                setForm({ ...form, type: e.target.value as Material["type"] });
                setFile(null);
              }}
            >
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Title *</label>
          <input
            className="input"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Lecture 1 — Option Basics"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Shown under the title on the student dashboard"
          />
        </div>

        {form.type === "HTML" ? (
          <div>
            <label className="label">
              HTML file {editingId ? "(leave empty to keep the current file)" : "*"}
            </label>
            <input
              type="file"
              accept=".html,.htm,text/html"
              className="input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-ink-400">
              {meta.hint} Max 5 MB.
              {editingId && form.contentPath && !file
                ? " Currently using a built-in file."
                : ""}
            </p>
            {file && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="label">URL *</label>
            <input
              className="input"
              type="url"
              required
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
            />
            <p className="mt-1 text-xs text-ink-400">{meta.hint}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Saving…" : editingId ? "Save changes" : "Add material"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel</button>
          )}
        </div>
      </form>

      {/* List */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-xs text-ink-400 uppercase dark:border-ink-700">
              <th className="p-3">Order</th>
              <th className="p-3">Material</th>
              <th className="p-3">Type</th>
              <th className="p-3">Source</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-ink-400">No materials yet — add one above.</td></tr>
            ) : (
              materials.map((m) => (
                <tr key={m.id} className="border-b border-ink-100 last:border-0 dark:border-ink-800">
                  <td className="p-3 whitespace-nowrap">
                    <button className="btn-secondary !px-2 !py-0.5 text-xs" onClick={() => move(m, -1)} title="Move up">↑</button>{" "}
                    <button className="btn-secondary !px-2 !py-0.5 text-xs" onClick={() => move(m, 1)} title="Move down">↓</button>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-ink-900 dark:text-white">{m.title}</span>
                    {m.description && <span className="block text-xs text-ink-400">{m.description}</span>}
                  </td>
                  <td className="p-3 whitespace-nowrap">{TYPE_META[m.type].icon} {m.type}</td>
                  <td className="max-w-xs truncate p-3 text-xs text-ink-500 dark:text-ink-400">
                    {m.type === "HTML"
                      ? m.hasHtmlContent
                        ? "📎 Uploaded file"
                        : m.contentPath
                          ? `📄 ${m.contentPath}`
                          : "— no content —"
                      : m.url}
                  </td>
                  <td className="p-3">
                    {m.isActive ? (
                      <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">VISIBLE</span>
                    ) : (
                      <span className="badge bg-ink-200 text-ink-600 dark:bg-ink-700 dark:text-ink-300">HIDDEN</span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => startEdit(m)}>Edit</button>{" "}
                    <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => toggleActive(m)}>
                      {m.isActive ? "Hide" : "Show"}
                    </button>{" "}
                    <button className="btn-danger !px-3 !py-1 text-xs" onClick={() => remove(m)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
