import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import StudentForm from "@/components/admin/StudentForm";

export const metadata: Metadata = { title: "Add Student" };

export default async function NewStudentPage() {
  const [courses, materials] = await Promise.all([
    prisma.course.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.material.findMany({
      where: { isActive: true },
      include: { course: { select: { name: true } } },
      orderBy: [{ courseId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Add student</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500 dark:text-ink-400">
        Create a new student account with its subscription window.
      </p>
      <StudentForm
        mode="create"
        courses={courses}
        materials={materials.map((m) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          courseName: m.course.name,
        }))}
      />
    </div>
  );
}
