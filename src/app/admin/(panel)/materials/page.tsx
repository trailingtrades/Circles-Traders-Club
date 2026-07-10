import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import MaterialsManager from "@/components/admin/MaterialsManager";

export const metadata: Metadata = { title: "Materials" };
export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const [courses, materials] = await Promise.all([
    prisma.course.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.material.findMany({
      orderBy: [{ courseId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Materials</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500 dark:text-ink-400">
        Everything your students see on their dashboard — study material, recorded lectures,
        Google Sheets and links. Only visible to students with an active subscription.
      </p>
      <MaterialsManager courses={courses} initialMaterials={materials} />
    </div>
  );
}
