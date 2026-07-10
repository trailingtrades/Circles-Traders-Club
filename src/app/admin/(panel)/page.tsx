import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { startOfToday } from "@/lib/student-filters";
import { smtpConfigured } from "@/lib/mail";
import EmailTestCard from "@/components/admin/EmailTestCard";

export const metadata: Metadata = { title: "Admin Dashboard" };

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="card p-5">
      <p className="label">{label}</p>
      <p className={`text-3xl font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default async function AdminDashboard() {
  const today = startOfToday();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const soon = new Date(today.getTime() + 7 * 86_400_000);

  const [total, active, expired, disabled, newThisWeek, expiringSoon, recentLogins, liveSessions] =
    await prisma.$transaction([
      prisma.student.count(),
      prisma.student.count({ where: { status: "ACTIVE", subscriptionEnd: { gte: today } } }),
      prisma.student.count({ where: { status: "ACTIVE", subscriptionEnd: { lt: today } } }),
      prisma.student.count({ where: { status: { in: ["DISABLED", "REVOKED"] } } }),
      prisma.student.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.student.count({
        where: { status: "ACTIVE", subscriptionEnd: { gte: today, lte: soon } },
      }),
      prisma.activityLog.findMany({
        where: { type: "STUDENT_LOGIN" },
        include: { student: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.session.count({ where: { studentId: { not: null }, expiresAt: { gt: new Date() } } }),
    ]);

  // Fee totals: received = sum of all payments; due = per-student shortfall.
  const feeRows = await prisma.student.findMany({
    select: { feeTotal: true, feePaid: true },
  });
  const feesReceived = feeRows.reduce((sum, s) => sum + s.feePaid, 0);
  const feesDue = feeRows.reduce((sum, s) => sum + Math.max(0, s.feeTotal - s.feePaid), 0);
  const dueCount = feeRows.filter((s) => s.feeTotal > s.feePaid).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Institute overview at a glance.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total students" value={total} tone="text-ink-900 dark:text-white" />
        <StatCard label="Active" value={active} tone="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Expired" value={expired} tone="text-red-600 dark:text-red-400" />
        <StatCard label="Disabled / Revoked" value={disabled} tone="text-ink-500 dark:text-ink-400" />
        <StatCard label="New (7 days)" value={newThisWeek} tone="text-blue-600 dark:text-blue-400" />
        <StatCard label="Expiring ≤ 7 days" value={expiringSoon} tone="text-amber-600 dark:text-amber-400" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Fees received" value={inr(feesReceived)} tone="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Fees due" value={inr(feesDue)} tone={feesDue > 0 ? "text-red-600 dark:text-red-400" : "text-ink-900 dark:text-white"} />
        <div className="card p-5">
          <p className="label">Students with payment due</p>
          <p className="text-3xl font-extrabold text-ink-900 dark:text-white">{dueCount}</p>
          {dueCount > 0 && (
            <Link href="/admin/students?status=due" className="mt-1 inline-block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
              View defaulters →
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-ink-900 dark:text-white">Recent logins</h2>
            <Link href="/admin/logs" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
              View all logs →
            </Link>
          </div>
          {recentLogins.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">No student logins yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-xs text-ink-400 uppercase dark:border-ink-700">
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">IP</th>
                    <th className="py-2">Device</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogins.map((log) => (
                    <tr key={log.id} className="border-b border-ink-100 last:border-0 dark:border-ink-800">
                      <td className="py-2 pr-4">
                        <span className="font-semibold text-ink-900 dark:text-white">
                          {log.student?.fullName ?? "—"}
                        </span>
                        <span className="block text-xs text-ink-400">{log.student?.email}</span>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {log.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="py-2 pr-4">{log.ip}</td>
                      <td className="py-2">{log.device} · {log.browser}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="label">Live student sessions</p>
            <p className="text-3xl font-extrabold text-ink-900 dark:text-white">{liveSessions}</p>
          </div>
          <EmailTestCard configured={smtpConfigured()} />
          <div className="card p-5">
            <h2 className="mb-3 font-bold text-ink-900 dark:text-white">Quick actions</h2>
            <div className="flex flex-col gap-2">
              <Link href="/admin/students/new" className="btn-primary">➕ Add student</Link>
              <Link href="/admin/students?status=expired" className="btn-secondary">⏰ View expired</Link>
              <a href="/api/admin/students/export" className="btn-secondary">📤 Export all (CSV)</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
