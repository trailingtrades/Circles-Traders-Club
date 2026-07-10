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
  notes?: string;
};

export default function StudentForm({
  mode,
  studentId,
  initial,
  courses,
}: {
  mode: "create" | "edit";
  studentId?: string;
  initial?: Partial<StudentFormValues>;
  courses: { id: string; name: string }[];
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
    notes: initial?.notes ?? "",
  });
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
