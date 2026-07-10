import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import StudentForm from "@/components/admin/StudentForm";

export const metadata: Metadata = { title: "Add Student" };

export default async function NewStudentPage() {
  const courses = await prisma.course.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Add student</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500 dark:text-ink-400">
        Create a new student account with its subscription window.
      </p>
      <StudentForm mode="create" courses={courses} />
    </div>
  );
}
