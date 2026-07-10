import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accessState, daysRemaining } from "@/lib/subscription";
import { materialsForStudent } from "@/lib/student-materials";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";
import IdleLogout from "@/components/IdleLogout";

export const metadata: Metadata = { title: "My Dashboard" };
export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default async function DashboardPage() {
  const current = await getStudentSession();
  if (!current) redirect("/login");

  const { student } = current;
  const state = accessState(student);
  if (state !== "ok") redirect("/expired");

  const course = student.courseId
    ? await prisma.course.findUnique({ where: { id: student.courseId } })
    : await prisma.course.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });

  const materials = await materialsForStudent(student);

  const days = daysRemaining(student);
  const expiringSoon = days <= 7;
  const typeMeta: Record<string, { icon: string; label: string }> = {
    HTML: { icon: "📖", label: "Study material" },
    VIDEO: { icon: "🎥", label: "Recorded lecture" },
    SHEET: { icon: "📊", label: "Live sheet" },
    LINK: { icon: "🔗", label: "Resource" },
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6">
      <IdleLogout />
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">
        Welcome back, {student.fullName.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Here's your enrollment overview.
      </p>

      {expiringSoon && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          ⚠️ Your subscription expires in <b>{days} day{days === 1 ? "" : "s"}</b> (on {fmt(student.subscriptionEnd)}).
          Please contact the institute to renew and keep uninterrupted access.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="label">Subscription status</p>
          <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            ● ACTIVE
          </span>
        </div>
        <div className="card p-5">
          <p className="label">Course</p>
          <p className="font-semibold text-ink-900 dark:text-white">
            {course?.name ?? "Not assigned yet"}
          </p>
        </div>
        <div className="card p-5">
          <p className="label">Valid until</p>
          <p className="font-semibold text-ink-900 dark:text-white">{fmt(student.subscriptionEnd)}</p>
        </div>
        <div className="card p-5">
          <p className="label">Days remaining</p>
          <p className={`text-2xl font-extrabold ${expiringSoon ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {days}
          </p>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="text-lg font-bold text-ink-900 dark:text-white">
          {course?.name ?? "Learning material"}
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {course?.description ?? "Your enrolled study material."}
        </p>

        {materials.length === 0 ? (
          <div className="mt-5">
            <Link href="/course" className="btn-primary">📖 Open Learning Material</Link>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-ink-100 dark:divide-ink-800">
            {materials.map((m) => {
              const meta = typeMeta[m.type] ?? typeMeta.LINK;
              return (
                <li key={m.id}>
                  <Link
                    href={`/materials/${m.id}`}
                    className="group flex items-center gap-4 py-3 transition hover:bg-ink-50 dark:hover:bg-ink-800/50"
                  >
                    <span className="text-2xl">{meta.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                        {m.title}
                      </span>
                      <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
                        {m.description || meta.label}
                      </span>
                    </span>
                    <span className="btn-secondary shrink-0 !px-3 !py-1 text-xs">Open →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-ink-400">
        Signed in as {student.email}. This material is licensed to you personally — sharing your
        login is a violation of the institute's terms.
      </p>
    </main>
  );
}
