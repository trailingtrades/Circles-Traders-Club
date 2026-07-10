"use client";

import { useState } from "react";

type ImportResult = { created: number; skipped: { line: number; reason: string }[] };

const SAMPLE = `fullName,email,password,mobile,subscriptionStart,subscriptionEnd,notes
Ravi Kumar,ravi@example.com,Secret@123,+91 9876543210,2026-07-01,2026-12-31,Batch A
Priya Shah,priya@example.com,Secret@456,,2026-07-01,2027-06-30,`;

export default function ImportCsv() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/students/import", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Import failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "students-sample.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-6">
        <h2 className="mb-2 font-bold text-ink-900 dark:text-white">CSV format</h2>
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Required columns: <code>fullName, email, password, subscriptionStart, subscriptionEnd</code>.
          Optional: <code>mobile, notes</code>. Dates must be <code>YYYY-MM-DD</code>. Max 1000 rows.
          Duplicate emails are skipped, not overwritten.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-ink-100 p-3 text-xs dark:bg-ink-900">{SAMPLE}</pre>
        <button type="button" onClick={downloadSample} className="btn-secondary mt-3 !py-1.5 text-xs">
          ⬇️ Download sample CSV
        </button>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6">
        <div>
          <label className="label">CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            required
            className="input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button type="submit" disabled={busy || !file} className="btn-primary">
          {busy ? "Importing…" : "Import students"}
        </button>
        {error && (
          <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </p>
        )}
        {result && (
          <div className="rounded-lg bg-ink-100 px-4 py-3 text-sm dark:bg-ink-900">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
              ✓ {result.created} student{result.created === 1 ? "" : "s"} created
            </p>
            {result.skipped.length > 0 && (
              <>
                <p className="mt-2 font-semibold text-amber-700 dark:text-amber-400">
                  {result.skipped.length} row{result.skipped.length === 1 ? "" : "s"} skipped:
                </p>
                <ul className="mt-1 list-inside list-disc text-xs text-ink-600 dark:text-ink-300">
                  {result.skipped.slice(0, 20).map((s) => (
                    <li key={s.line}>Line {s.line}: {s.reason}</li>
                  ))}
                  {result.skipped.length > 20 && <li>…and {result.skipped.length - 20} more</li>}
                </ul>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
