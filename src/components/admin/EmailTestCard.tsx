"use client";

import { useState } from "react";

type TestResponse = {
  ok: boolean;
  error?: string;
  to?: string;
  config?: { configured: boolean; host: string; port: string; user: string; pass: string; from: string };
};

export default function EmailTestCard({ configured }: { configured: boolean }) {
  const [result, setResult] = useState<TestResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function test() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/email-test", { method: "POST" });
      setResult(await res.json());
    } catch {
      setResult({ ok: false, error: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-ink-900 dark:text-white">Email delivery</h2>
        {configured ? (
          <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            SMTP CONFIGURED
          </span>
        ) : (
          <span className="badge bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
            NOT CONFIGURED
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
        {configured
          ? "Send a test email to your admin address to verify the SMTP settings."
          : "SMTP_HOST is empty — welcome emails, password resets and reminders are only printed to the server logs. Set the SMTP_* variables to enable delivery."}
      </p>
      <button type="button" className="btn-secondary mt-3 !py-1.5 text-xs" disabled={busy} onClick={test}>
        {busy ? "Sending…" : "✉️ Send test email"}
      </button>

      {result && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            result.ok
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
              : "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200"
          }`}
        >
          {result.ok ? (
            <>✓ Test email sent to <b>{result.to}</b> — check the inbox (and spam folder).</>
          ) : (
            <>
              <b>Failed:</b> {result.error}
              {result.config && (
                <span className="mt-1 block text-[11px] opacity-80">
                  host {result.config.host} · port {result.config.port} · user {result.config.user} ·
                  pass {result.config.pass} · from {result.config.from}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
