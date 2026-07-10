import "server-only";
import type { Material, Student } from "@prisma/client";
import { prisma } from "@/lib/db";

// Central access logic for learning materials.
//
//   ALL    → the student sees every active material of their (active) course
//   CUSTOM → the student sees exactly the materials granted to them,
//            regardless of course
//
// Both modes still require a valid session and an active subscription —
// that is enforced by the callers before these run.

type StudentAccess = Pick<Student, "id" | "courseId" | "materialAccess">;

async function defaultCourseId(): Promise<string | null> {
  const course = await prisma.course.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return course?.id ?? null;
}

function byOrder(a: Material, b: Material): number {
  return a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime();
}

export async function materialsForStudent(student: StudentAccess): Promise<Material[]> {
  if (student.materialAccess === "CUSTOM") {
    const grants = await prisma.studentMaterialAccess.findMany({
      where: { studentId: student.id },
      include: { material: true },
    });
    return grants
      .map((g) => g.material)
      .filter((m) => m.isActive)
      .sort(byOrder);
  }

  const courseId = student.courseId ?? (await defaultCourseId());
  if (!courseId) return [];
  return prisma.material.findMany({
    where: { courseId, isActive: true, course: { isActive: true } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function accessibleMaterial(
  student: StudentAccess,
  materialId: string
): Promise<Material | null> {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: { course: { select: { isActive: true } } },
  });
  if (!material || !material.isActive) return null;

  if (student.materialAccess === "CUSTOM") {
    const grant = await prisma.studentMaterialAccess.findUnique({
      where: { studentId_materialId: { studentId: student.id, materialId } },
    });
    return grant ? material : null;
  }

  if (!material.course.isActive) return null;
  const courseId = student.courseId ?? (await defaultCourseId());
  return material.courseId === courseId ? material : null;
}
