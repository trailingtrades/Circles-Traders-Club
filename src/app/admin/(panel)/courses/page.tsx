import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import CoursesManager from "@/components/admin/CoursesManager";

export const metadata: Metadata = { title: "Courses" };
export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    include: { _count: { select: { students: true, materials: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Courses</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500 dark:text-ink-400">
        Group materials into courses and control which students see what by assigning each
        student to a course.
      </p>
      <CoursesManager initialCourses={courses} />
    </div>
  );
}
