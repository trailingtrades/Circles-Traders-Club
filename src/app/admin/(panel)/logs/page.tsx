import Link from "next/link";
import type { Metadata } from "next";
import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Activity Logs" };
export const dynamic = "force-dynamic";

const PER_PAGE = 30;

const FILTERS: { key: string; label: string; types?: ActivityType[] }[] = [
  { key: "all", label: "All" },
  { key: "logins", label: "Logins", types: ["STUDENT_LOGIN", "ADMIN_LOGIN"] },
  { key: "logouts", label: "Logouts", types: ["STUDENT_LOGOUT", "ADMIN_LOGOUT", "FORCED_LOGOUT"] },
  { key: "failed", label: "Failed logins", types: ["STUDENT_LOGIN_FAILED", "ADMIN_LOGIN_FAILED"] },
  { key: "resets", label: "Password resets", types: ["PASSWORD_RESET_REQUESTED", "PASSWORD_RESET_COMPLETED", "PASSWORD_CHANGED_BY_ADMIN"] },
  { key: "content", label: "Content access", types: ["CONTENT_ACCESSED", "ACCESS_DENIED_EXPIRED"] },
  {
    key: "admin",
    label: "Admin changes",
    types: [
      "STUDENT_CREATED", "STUDENT_UPDATED", "STUDENT_DELETED", "STUDENT_DISABLED",
      "STUDENT_ENABLED", "STUDENT_REVOKED", "SUBSCRIPTION_EXTENDED", "BULK_OPERATION",
    ],
  },
];

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.filter) ?? FILTERS[0];
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const where: Prisma.ActivityLogWhereInput = filter.types ? { type: { in: filter.types } } : {};
  const [total, logs] = await prisma.$transaction([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      include: {
        student: { select: { fullName: true, email: true } },
        admin: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Activity logs</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500 dark:text-ink-400">
        Full audit trail — logins, content access, password resets and admin changes.
      </p>

      <div className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/logs?filter=${f.key}`}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              filter.key === f.key
                ? "bg-brand-500 text-ink-900"
                : "bg-ink-100 text-ink-500 hover:text-ink-900 dark:bg-ink-800 dark:text-ink-300 dark:hover:text-white"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-xs text-ink-400 uppercase dark:border-ink-700">
              <th className="p-3">Date &amp; time</th>
              <th className="p-3">Event</th>
              <th className="p-3">Who</th>
              <th className="p-3">Detail</th>
              <th className="p-3">IP</th>
              <th className="p-3">Device / Browser</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-ink-400">No log entries.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-ink-100 align-top last:border-0 dark:border-ink-800">
                  <td className="p-3 whitespace-nowrap">
                    {log.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })}
                  </td>
                  <td className="p-3">
                    <span className="badge bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">{log.type}</span>
                  </td>
                  <td className="p-3">
                    {log.student ? (
                      <span>{log.student.fullName}<span className="block text-xs text-ink-400">{log.student.email}</span></span>
                    ) : log.admin ? (
                      <span>{log.admin.name}<span className="block text-xs text-ink-400">admin</span></span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-xs p-3 text-xs break-words text-ink-500 dark:text-ink-400">{log.detail || "—"}</td>
                  <td className="p-3 whitespace-nowrap">{log.ip || "—"}</td>
                  <td className="p-3 text-xs">{log.device || "—"} · {log.browser || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > PER_PAGE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500 dark:text-ink-400">
            {total} entries · page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/logs?filter=${filter.key}&page=${page - 1}`} className="btn-secondary !py-1 text-xs">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`/admin/logs?filter=${filter.key}&page=${page + 1}`} className="btn-secondary !py-1 text-xs">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
