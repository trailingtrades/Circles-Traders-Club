import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { materialUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/materials/:id
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const body = materialUpdateSchema.parse(await req.json());

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) return jsonError(404, "Material not found");

    const data: Prisma.MaterialUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.type !== undefined) data.type = body.type;
    if (body.contentPath !== undefined) data.contentPath = body.contentPath;
    if (body.url !== undefined) data.url = body.url;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const finalType = body.type ?? material.type;
    const finalPath = body.contentPath !== undefined ? body.contentPath : material.contentPath;
    const finalUrl = body.url !== undefined ? body.url : material.url;
    if (finalType === "HTML" && !finalPath) return jsonError(400, "HTML materials need a contentPath");
    if (finalType !== "HTML" && !finalUrl) return jsonError(400, `${finalType} materials need a URL`);

    const updated = await prisma.material.update({ where: { id }, data });
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
