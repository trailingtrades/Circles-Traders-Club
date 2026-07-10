import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { courseUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/courses/:id
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const body = courseUpdateSchema.parse(await req.json());

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return jsonError(404, "Course not found");

    const data: Prisma.CourseUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await prisma.course.update({
      where: { id },
      data,
      include: { _count: { select: { students: true, materials: true } } },
    });
    await logActivity({
      type: "COURSE_UPDATED",
      adminId: guard.admin.id,
      detail: `Course updated: ${updated.name}${body.isActive === false ? " (deactivated)" : ""}`,
    });
    return NextResponse.json({ course: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}

// DELETE /api/admin/courses/:id — blocked while students are enrolled
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: { _count: { select: { students: true, materials: true } } },
    });
    if (!course) return jsonError(404, "Course not found");
    if (course._count.students > 0) {
      return jsonError(
        409,
        `${course._count.students} student(s) are enrolled in this course. Move them to another course first, or deactivate the course instead.`
      );
    }

    await prisma.course.delete({ where: { id } }); // materials cascade
    await logActivity({
      type: "COURSE_DELETED",
      adminId: guard.admin.id,
      detail: `Course deleted: ${course.name} (${course._count.materials} materials removed)`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
