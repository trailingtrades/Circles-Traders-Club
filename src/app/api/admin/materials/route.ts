import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { materialCreateSchema } from "@/lib/validation";

export const maxDuration = 60;

const MAX_HTML_BYTES = 5 * 1024 * 1024; // 5 MB per HTML document

// GET /api/admin/materials — all materials grouped by course order
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const materials = await prisma.material.findMany({
      // Don't ship the (potentially large) HTML blobs in the list response;
      // expose a boolean flag instead.
      omit: { htmlContent: true },
      include: { course: { select: { id: true, name: true } } },
      orderBy: [{ courseId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
    // Presence of htmlContent without transferring it.
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM materials WHERE "htmlContent" IS NOT NULL`;
    const hasHtml = new Set(rows.map((r) => r.id));
    return NextResponse.json({
      materials: materials.map((m) => ({ ...m, hasHtmlContent: hasHtml.has(m.id) })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

// POST /api/admin/materials — add a material to a course.
// HTML materials are uploaded as multipart/form-data (the .html file is stored
// in the DB); VIDEO/SHEET/LINK materials are sent as JSON.
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const contentType = req.headers.get("content-type") || "";

    // ---- HTML upload (multipart) --------------------------------------------
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const courseId = String(form.get("courseId") || "");
      const title = String(form.get("title") || "").trim();
      const description = String(form.get("description") || "").trim();
      const sortOrder = parseInt(String(form.get("sortOrder") || "0"), 10) || 0;
      const file = form.get("file");

      if (title.length < 2) return jsonError(400, "Title is required");
      if (!(file instanceof File)) return jsonError(400, "Upload an HTML file");
      if (file.size === 0) return jsonError(400, "The uploaded file is empty");
      if (file.size > MAX_HTML_BYTES) return jsonError(400, "HTML file too large (max 5 MB)");
      const name = file.name.toLowerCase();
      if (!name.endsWith(".html") && !name.endsWith(".htm")) {
        return jsonError(400, "Only .html files are allowed");
      }

      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) return jsonError(404, "Course not found");

      const htmlContent = await file.text();

      const material = await prisma.material.create({
        data: {
          courseId,
          title,
          description: description || null,
          type: "HTML",
          htmlContent,
          sortOrder,
          isActive: true,
        },
      });

      await logActivity({
        type: "MATERIAL_CREATED",
        adminId: guard.admin.id,
        detail: `Material created: ${material.title} (HTML upload, ${(file.size / 1024).toFixed(0)} KB)`,
      });
      return NextResponse.json({ material: { ...material, htmlContent: null } }, { status: 201 });
    }

    // ---- VIDEO / SHEET / LINK (JSON) ----------------------------------------
    const body = materialCreateSchema.parse(await req.json());
    if (body.type === "HTML") {
      return jsonError(400, "HTML materials must be uploaded as a file");
    }
    const course = await prisma.course.findUnique({ where: { id: body.courseId } });
    if (!course) return jsonError(404, "Course not found");

    const material = await prisma.material.create({
      data: {
        courseId: body.courseId,
        title: body.title,
        description: body.description,
        type: body.type,
        url: body.url,
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
