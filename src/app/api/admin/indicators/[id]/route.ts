import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { indicatorUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/indicators/:id
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const body = indicatorUpdateSchema.parse(await req.json());

    const indicator = await prisma.indicator.findUnique({ where: { id } });
    if (!indicator) return jsonError(404, "Indicator not found");

    const data: Prisma.IndicatorUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await prisma.indicator.update({
      where: { id },
      data,
      include: { _count: { select: { studentGrants: true } } },
    });
    await logActivity({
      type: "INDICATOR_UPDATED",
      adminId: guard.admin.id,
      detail: `Indicator updated: ${updated.name}`,
    });
    return NextResponse.json({ indicator: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}

// DELETE /api/admin/indicators/:id
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const indicator = await prisma.indicator.findUnique({
      where: { id },
      include: { _count: { select: { studentGrants: true } } },
    });
    if (!indicator) return jsonError(404, "Indicator not found");

    await prisma.indicator.delete({ where: { id } }); // grants cascade
    await logActivity({
      type: "INDICATOR_DELETED",
      adminId: guard.admin.id,
      detail: `Indicator deleted: ${indicator.name} (was granted to ${indicator._count.studentGrants} student(s))`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
