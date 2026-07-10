"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Quick actions on the student detail page: enable/disable, revoke,
// extend subscription, force logout, delete.
export default function StudentActions({
  studentId,
  status,
}: {
  studentId: string;
  status: "ACTIVE" | "DISABLED" | "REVOKED";
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(path: string, init: RequestInit, successMessage: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(path, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(`✗ ${data.error || "Action failed"}`);
        return;
      }
      setNotice(`✓ ${successMessage}`);
      router.refresh();
    } catch {
      setNotice("✗ Network error");
    } finally {
      setBusy(false);
    }
  }

  function setStatus(next: string, message: string) {
    return call(
      `/api/admin/students/${studentId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      },
      message
    );
  }

  async function extend() {
    const input = window.prompt("Extend subscription by how many days?", "30");
    if (!input) return;
    const days = parseInt(input, 10);
    if (!Number.isFinite(days) || days < 1) {
      setNotice("✗ Enter a valid number of days");
      return;
    }
    await call(
      "/api/admin/students/bulk",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend", ids: [studentId], extendDays: days }),
      },
      `Subscription extended by ${days} days`
    );
  }

  async function forceLogout() {
    await call(
      `/api/admin/students/${studentId}/force-logout`,
      { method: "POST" },
      "All sessions terminated"
    );
  }

  async function remove() {
    if (!window.confirm("Permanently delete this student? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/students/${studentId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/students");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setNotice(`✗ ${data.error || "Delete failed"}`);
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-bold text-ink-900 dark:text-white">Actions</h2>
      {notice && <p className="mb-3 rounded-lg bg-ink-100 px-3 py-2 text-sm dark:bg-ink-800">{notice}</p>}
      <div className="flex flex-col gap-2">
        <button className="btn-secondary" disabled={busy} onClick={extend}>
          ⏳ Extend subscription
        </button>
        {status !== "ACTIVE" ? (
          <button className="btn-secondary" disabled={busy} onClick={() => setStatus("ACTIVE", "Account enabled")}>
            ✅ Enable account
          </button>
        ) : (
          <button className="btn-secondary" disabled={busy} onClick={() => setStatus("DISABLED", "Account disabled (temporary)")}>
            🚫 Disable temporarily
          </button>
        )}
        {status !== "REVOKED" && (
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Revoke access permanently? The student will no longer be able to log in."))
                setStatus("REVOKED", "Access revoked");
            }}
          >
            ⛔ Revoke access
          </button>
        )}
        <button className="btn-secondary" disabled={busy} onClick={forceLogout}>
          🔌 Force logout everywhere
        </button>
        <button className="btn-danger" disabled={busy} onClick={remove}>
          🗑️ Delete student
        </button>
      </div>
    </div>
  );
}
