import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { materialCreateSchema } from "@/lib/validation";

// GET /api/admin/materials — all materials grouped by course order
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const materials = await prisma.material.findMany({
      include: { course: { select: { id: true, name: true } } },
      orderBy: [{ courseId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ materials });
  } catch (err) {
    return handleRouteError(err);
  }
}

// POST /api/admin/materials — add a material to a course
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const body = materialCreateSchema.parse(await req.json());
    const course = await prisma.course.findUnique({ where: { id: body.courseId } });
    if (!course) return jsonError(404, "Course not found");

    const material = await prisma.material.create({
      data: {
        courseId: body.courseId,
        title: body.title,
        description: body.description,
        type: body.type,
        contentPath: body.type === "HTML" ? body.contentPath : null,
        url: body.type === "HTML" ? null : body.url,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
    });

    await logActivity({
      type: "MATERIAL_CREATED",
      adminId: guard.admin.id,
      detail: `Material created: ${material.title} (${material.type})`,
    });
    return NextResponse.json({ material }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
