import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { materialUpdateSchema } from "@/lib/validation";

export const maxDuration = 60;
const MAX_HTML_BYTES = 5 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/materials/:id
// JSON body: edit metadata (title, description, sortOrder, isActive, url).
// multipart/form-data with a `file`: replace an HTML material's document.
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) return jsonError(404, "Material not found");

    const contentType = req.headers.get("content-type") || "";

    // ---- Replace HTML document (multipart) ----------------------------------
    if (contentType.includes("multipart/form-data")) {
      if (material.type !== "HTML") {
        return jsonError(400, "Only HTML materials accept a file upload");
      }
      const form = await req.formData();
      const data: Prisma.MaterialUpdateInput = {};
      const title = form.get("title");
      const description = form.get("description");
      const sortOrder = form.get("sortOrder");
      if (typeof title === "string" && title.trim().length >= 2) data.title = title.trim();
      if (typeof description === "string") data.description = description.trim() || null;
      if (typeof sortOrder === "string" && sortOrder !== "") data.sortOrder = parseInt(sortOrder, 10) || 0;

      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_HTML_BYTES) return jsonError(400, "HTML file too large (max 5 MB)");
        const name = file.name.toLowerCase();
        if (!name.endsWith(".html") && !name.endsWith(".htm")) {
          return jsonError(400, "Only .html files are allowed");
        }
        data.htmlContent = await file.text();
        data.contentPath = null; // uploaded content supersedes any legacy file path
      }

      const updated = await prisma.material.update({ where: { id }, data, omit: { htmlContent: true } });
      await logActivity({
        type: "MATERIAL_UPDATED",
        adminId: guard.admin.id,
        detail: `Material updated: ${updated.title}${data.htmlContent ? " (new HTML file)" : ""}`,
      });
      return NextResponse.json({ material: updated });
    }

    // ---- Metadata edit (JSON) -----------------------------------------------
    const body = materialUpdateSchema.parse(await req.json());
    const data: Prisma.MaterialUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.url !== undefined) data.url = body.url;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    // Non-HTML materials must keep a URL.
    if (material.type !== "HTML") {
      const finalUrl = body.url !== undefined ? body.url : material.url;
      if (!finalUrl) return jsonError(400, `${material.type} materials need a URL`);
    }

    const updated = await prisma.material.update({ where: { id }, data, omit: { htmlContent: true } });
    await logActivity({
      type: "MATERIAL_UPDATED",
      adminId: guard.admin.id,
      detail: `Material updated: ${updated.title}`,
    });
    return NextResponse.json({ material: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}

// DELETE /api/admin/materials/:id
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) return jsonError(404, "Material not found");

    await prisma.material.delete({ where: { id } });
    await logActivity({
      type: "MATERIAL_DELETED",
      adminId: guard.admin.id,
      detail: `Material deleted: ${material.title} (${material.type})`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
