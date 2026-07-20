import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { handleRouteError } from "@/lib/api-helpers";
import { indicatorCreateSchema } from "@/lib/validation";

// GET /api/admin/indicators — full catalog with grant counts
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const indicators = await prisma.indicator.findMany({
      include: { _count: { select: { studentGrants: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ indicators });
  } catch (err) {
    return handleRouteError(err);
  }
}

// POST /api/admin/indicators — add an indicator to the catalog
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const body = indicatorCreateSchema.parse(await req.json());
    const indicator = await prisma.indicator.create({
      data: { name: body.name, description: body.description },
      include: { _count: { select: { studentGrants: true } } },
    });

    await logActivity({
      type: "INDICATOR_CREATED",
      adminId: guard.admin.id,
      detail: `Indicator created: ${indicator.name}`,
    });
    return NextResponse.json({ indicator }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
