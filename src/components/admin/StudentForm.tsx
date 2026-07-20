"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type StudentFormValues = {
  fullName: string;
  email: string;
  password?: string;
  mobile?: string;
  courseId?: string;
  subscriptionStart: string; // YYYY-MM-DD
  subscriptionEnd: string; // YYYY-MM-DD
  feeTotal: number;
  feePaid: number;
  materialAccess: "ALL" | "CUSTOM";
  notes?: string;
};

export type MaterialOption = {
  id: string;
  title: string;
  type: string;
  courseName: string;
};

const TYPE_ICONS: Record<string, string> = { HTML: "📖", VIDEO: "🎥", SHEET: "📊", LINK: "🔗" };

export type IndicatorOption = {
  id: string;
  name: string;
  description: string | null;
};

export default function StudentForm({
  mode,
  studentId,
  initial,
  courses,
  materials = [],
  initialMaterialIds = [],
  indicators = [],
  initialIndicatorIds = [],
}: {
  mode: "create" | "edit";
  studentId?: string;
  initial?: Partial<StudentFormValues>;
  courses: { id: string; name: string }[];
  materials?: MaterialOption[];
  initialMaterialIds?: string[];
  indicators?: IndicatorOption[];
  initialIndicatorIds?: string[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<StudentFormValues>({
    fullName: initial?.fullName ?? "",
    email: initial?.email ?? "",
    password: "",
    mobile: initial?.mobile ?? "",
    courseId: initial?.courseId ?? (courses[0]?.id || ""),
    subscriptionStart: initial?.subscriptionStart ?? new Date().toISOString().slice(0, 10),
    subscriptionEnd:
      initial?.subscriptionEnd ??
      new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    feeTotal: initial?.feeTotal ?? 0,
    feePaid: initial?.feePaid ?? 0,
    materialAccess: initial?.materialAccess ?? "ALL",
    notes: initial?.notes ?? "",
  });
  const [materialIds, setMaterialIds] = useState<Set<string>>(new Set(initialMaterialIds));
  const [indicatorIds, setIndicatorIds] = useState<Set<string>>(new Set(initialIndicatorIds));
  const [sendWelcome, setSendWelcome] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof StudentFormValues>(key: K, val: StudentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...values };
      if (mode === "edit" && !values.password) delete payload.password;
      if (mode === "create") payload.sendWelcomeEmail = sendWelcome;
      if (values.materialAccess === "CUSTOM") payload.materialIds = Array.from(materialIds);
      payload.indicatorIds = Array.from(indicatorIds);

      const res = await fetch(
        mode === "create" ? "/api/admin/students" : `/api/admin/students/${studentId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      if (mode === "create") {
        router.push(`/admin/students/${data.student.id}`);
        router.refresh();
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6">
      {error && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
          ✓ Changes saved.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Full name *</label>
          <input className="input" required value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </div>
        <div>
          <label className="label">Email *</label>
          <input className="input" type="email" required value={values.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className="label">{mode === "create" ? "Password *" : "New password (leave blank to keep)"}</label>
          <input
            className="input"
            type="text"
            required={mode === "create"}
            minLength={8}
            autoComplete="new-password"
            placeholder="Min 8 characters"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Mobile number</label>
          <input className="input" type="tel" placeholder="+91 98765 43210" value={values.mobile} onChange={(e) => set("mobile", e.target.value)} />
        </div>
        <div>
          <label className="label">Course</label>
          <select className="input" value={values.courseId} onChange={(e) => set("courseId", e.target.value)}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Sub. start *</label>
            <input className="input" type="date" required value={values.subscriptionStart} onChange={(e) => set("subscriptionStart", e.target.value)} />
          </div>
          <div>
            <label className="label">Sub. end *</label>
            <input className="input" type="date" required value={values.subscriptionEnd} onChange={(e) => set("subscriptionEnd", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Course fee (₹)</label>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            value={values.feeTotal}
            onChange={(e) => set("feeTotal", Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
        </div>
        <div>
          <label className="label">Paid so far (₹)</label>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            value={values.feePaid}
            onChange={(e) => set("feePaid", Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
        </div>
        <div>
          <label className="label">Balance due</label>
          <p
            className={`rounded-lg px-3 py-2 text-sm font-bold ${
              values.feeTotal - values.feePaid > 0
                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            }`}
          >
            ₹{Math.max(0, values.feeTotal - values.feePaid).toLocaleString("en-IN")}
            {values.feeTotal - values.feePaid <= 0 && " · settled"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-ink-200 p-4 dark:border-ink-700">
        <label className="label">Material access</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
            <input
              type="radio"
              name="materialAccess"
              className="h-4 w-4 accent-brand-500"
              checked={values.materialAccess === "ALL"}
              onChange={() => set("materialAccess", "ALL")}
            />
            All materials of their course
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
            <input
              type="radio"
              name="materialAccess"
              className="h-4 w-4 accent-brand-500"
              checked={values.materialAccess === "CUSTOM"}
              onChange={() => set("materialAccess", "CUSTOM")}
            />
            Only selected materials
          </label>
        </div>

        {values.materialAccess === "CUSTOM" && (
          <div className="mt-3 max-h-64 space-y-3 overflow-y-auto rounded-lg bg-ink-50 p-3 dark:bg-ink-900">
            {materials.length === 0 ? (
              <p className="text-sm text-ink-400">No materials exist yet — add some on the Materials page first.</p>
            ) : (
              Object.entries(
                materials.reduce<Record<string, MaterialOption[]>>((acc, m) => {
                  (acc[m.courseName] ||= []).push(m);
                  return acc;
                }, {})
              ).map(([courseName, list]) => (
                <div key={courseName}>
                  <p className="mb-1 text-xs font-bold tracking-wide text-ink-400 uppercase">{courseName}</p>
                  {list.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand-500"
                        checked={materialIds.has(m.id)}
                        onChange={() => {
                          const next = new Set(materialIds);
                          if (next.has(m.id)) next.delete(m.id);
                          else next.add(m.id);
                          setMaterialIds(next);
                          setSaved(false);
                        }}
                      />
                      {TYPE_ICONS[m.type] ?? "🔗"} {m.title}
                    </label>
                  ))}
                </div>
              ))
            )}
            <p className="text-xs text-ink-400">
              {materialIds.size} material{materialIds.size === 1 ? "" : "s"} selected. The student
              sees exactly these, regardless of course.
            </p>
          </div>
        )}
      </div>

      {indicators.length > 0 && (
        <div className="rounded-xl border border-ink-200 p-4 dark:border-ink-700">
          <label className="label">Indicator access (shown on the student's dashboard)</label>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {indicators.map((ind) => (
              <label
                key={ind.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-500"
                  checked={indicatorIds.has(ind.id)}
                  onChange={() => {
                    const next = new Set(indicatorIds);
                    if (next.has(ind.id)) next.delete(ind.id);
                    else next.add(ind.id);
                    setIndicatorIds(next);
                    setSaved(false);
                  }}
                />
                📈 {ind.name}
                {ind.description && <span className="text-xs text-ink-400">— {ind.description}</span>}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-400">
            {indicatorIds.size} indicator{indicatorIds.size === 1 ? "" : "s"} granted. Display-only —
            the student sees these listed on their dashboard, nothing is clickable.
          </p>
        </div>
      )}

      <div>
        <label className="label">Notes (visible to admins only)</label>
        <textarea className="input" rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      {mode === "create" && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={sendWelcome} onChange={(e) => setSendWelcome(e.target.checked)} />
          Send welcome email to the student
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : mode === "create" ? "Create student" : "Save changes"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.push("/admin/students")}>
          Back to list
        </button>
      </div>
    </form>
  );
}
