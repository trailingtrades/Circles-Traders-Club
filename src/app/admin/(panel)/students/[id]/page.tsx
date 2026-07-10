import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import StudentForm from "@/components/admin/StudentForm";
import StudentActions from "@/components/admin/StudentActions";
import { accessState } from "@/lib/subscription";
import { formatDateOnly } from "@/lib/validation";

export const metadata: Metadata = { title: "Edit Student" };
export const dynamic = "force-dynamic";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [student, courses] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        sessions: { orderBy: { lastActiveAt: "desc" } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 15 },
      },
    }),
    prisma.course.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!student) notFound();

  const state = accessState(student);
  const stateBadge = {
    ok: ["ACTIVE", "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"],
    expired: ["EXPIRED", "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"],
    not_started: ["NOT STARTED", "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"],
    disabled: ["DISABLED", "bg-ink-200 text-ink-600 dark:bg-ink-700 dark:text-ink-300"],
    revoked: ["REVOKED", "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300"],
  }[state];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{student.fullName}</h1>
        <span className={`badge ${stateBadge[1]}`}>{stateBadge[0]}</span>
      </div>
      <p className="mt-1 mb-6 text-sm text-ink-500 dark:text-ink-400">
        {student.email} · joined {student.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}
        {student.lastLoginAt &&
          ` · last login ${student.lastLoginAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`}
      </p>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <StudentForm
            mode="edit"
            studentId={student.id}
            courses={courses}
            initial={{
              fullName: student.fullName,
              email: student.email,
              mobile: student.mobile ?? "",
              courseId: student.courseId ?? "",
              subscriptionStart: formatDateOnly(student.subscriptionStart),
              subscriptionEnd: formatDateOnly(student.subscriptionEnd),
              feeTotal: student.feeTotal,
              feePaid: student.feePaid,
              notes: student.notes ?? "",
            }}
          />

          <div className="card mt-6 p-5">
            <h2 className="mb-3 font-bold text-ink-900 dark:text-white">Recent activity</h2>
            {student.activityLogs.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-ink-400">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {student.activityLogs.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-baseline gap-2 border-b border-ink-100 pb-2 last:border-0 dark:border-ink-800">
                    <span className="badge bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">{log.type}</span>
                    <span className="text-ink-600 dark:text-ink-300">{log.detail}</span>
                    <span className="ml-auto text-xs whitespace-nowrap text-ink-400">
                      {log.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {log.ip}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <StudentActions studentId={student.id} status={student.status} />

          <div className="card p-5">
            <h2 className="mb-3 font-bold text-ink-900 dark:text-white">
              Active sessions ({student.sessions.length})
            </h2>
            {student.sessions.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-ink-400">Not signed in anywhere.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {student.sessions.map((s) => (
                  <li key={s.id} className="rounded-lg bg-ink-50 p-3 dark:bg-ink-900">
                    <p className="font-semibold text-ink-900 dark:text-white">
                      {s.device} · {s.browser}
                    </p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      IP {s.ip} · active{" "}
                      {s.lastActiveAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
