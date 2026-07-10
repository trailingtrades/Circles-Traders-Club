import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { handleRouteError } from "@/lib/api-helpers";
import { courseCreateSchema, slugify } from "@/lib/validation";

// GET /api/admin/courses — all courses with student/material counts
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const courses = await prisma.course.findMany({
      include: { _count: { select: { students: true, materials: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ courses });
  } catch (err) {
    return handleRouteError(err);
  }
}

// POST /api/admin/courses — create a course
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const body = courseCreateSchema.parse(await req.json());

    // Unique slug from the name; add a numeric suffix on collision.
    const base = slugify(body.name);
    let slug = base;
    for (let i = 2; await prisma.course.findUnique({ where: { slug } }); i++) {
      slug = `${base}-${i}`;
    }

    const course = await prisma.course.create({
      data: { name: body.name, description: body.description, slug },
      include: { _count: { select: { students: true, materials: true } } },
    });

    await logActivity({
      type: "COURSE_CREATED",
      adminId: guard.admin.id,
      detail: `Course created: ${course.name}`,
    });
    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
