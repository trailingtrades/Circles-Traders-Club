import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accessState, daysRemaining } from "@/lib/subscription";
import LogoutButton from "@/components/LogoutButton";
import IdleLogout from "@/components/IdleLogout";

export const metadata: Metadata = { title: "Learning Material" };
export const dynamic = "force-dynamic";

// The viewer page. The material itself is streamed by /api/course/content,
// which re-checks the session and subscription on every request — copying
// this page's URL (or the iframe URL) is useless without a valid login.
export default async function CoursePage() {
  const current = await getStudentSession();
  if (!current) redirect("/login");

  const { student } = current;
  if (accessState(student) !== "ok") redirect("/expired");

  const course = student.courseId
    ? await prisma.course.findUnique({ where: { id: student.courseId } })
    : await prisma.course.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });

  const days = daysRemaining(student);

  return (
    <main className="flex h-screen flex-col bg-ink-950">
      <IdleLogout minutes={45} />
      <header className="flex items-center justify-between gap-3 border-b border-ink-700 bg-ink-900 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="shrink-0 text-sm font-semibold text-brand-500 hover:text-brand-400">
            ← Dashboard
          </Link>
          <span className="truncate text-sm font-semibold text-white">
            {course?.name ?? "Learning material"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`hidden text-xs sm:inline ${days <= 7 ? "text-amber-400" : "text-ink-400"}`}>
            {days <= 7 ? `⚠️ ${days} day${days === 1 ? "" : "s"} left` : `${student.fullName}`}
          </span>
          <LogoutButton className="btn-secondary !px-3 !py-1 text-xs" />
        </div>
      </header>
      <iframe
        src="/api/course/content"
        title={course?.name ?? "Learning material"}
        className="w-full flex-1 border-0 bg-[#0e1117]"
        sandbox="allow-scripts allow-same-origin"
      />
    </main>
  );
}
