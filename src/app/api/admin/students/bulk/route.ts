import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { bulkActionSchema } from "@/lib/validation";

// POST /api/admin/students/bulk — extend / disable / enable / delete /
// force-logout many students at once.
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const body = bulkActionSchema.parse(await req.json());
    let affected = 0;

    switch (body.action) {
      case "extend": {
        if (!body.extendDays) return jsonError(400, "extendDays is required for extend");
        const students = await prisma.student.findMany({
          where: { id: { in: body.ids } },
          select: { id: true, subscriptionEnd: true },
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await prisma.$transaction(
          students.map((s) => {
            // Extend from the current end if still in the future, else from today
            // (a lapsed student renewing gets extendDays from now, not from the past).
            const base = s.subscriptionEnd > today ? s.subscriptionEnd : today;
            const newEnd = new Date(base);
            newEnd.setDate(newEnd.getDate() + body.extendDays!); // calendar days (DST-safe)
            newEnd.setHours(0, 0, 0, 0);
            return prisma.student.update({ where: { id: s.id }, data: { subscriptionEnd: newEnd } });
          })
        );
        affected = students.length;
        break;
      }
      case "disable": {
        const res = await prisma.student.updateMany({
          where: { id: { in: body.ids } },
          data: { status: "DISABLED" },
        });
        await prisma.session.deleteMany({ where: { studentId: { in: body.ids } } });
        affected = res.count;
        break;
      }
      case "enable": {
        const res = await prisma.student.updateMany({
          where: { id: { in: body.ids } },
          data: { status: "ACTIVE" },
        });
        affected = res.count;
        break;
      }
      case "delete": {
        const res = await prisma.student.deleteMany({ where: { id: { in: body.ids } } });
        affected = res.count;
        break;
      }
      case "force_logout": {
        const res = await prisma.session.deleteMany({ where: { studentId: { in: body.ids } } });
        affected = res.count;
        break;
      }
    }

    await logActivity({
      type: "BULK_OPERATION",
      adminId: guard.admin.id,
      detail: `${body.action}${body.extendDays ? ` +${body.extendDays}d` : ""} on ${body.ids.length} student(s), ${affected} affected`,
    });
    return NextResponse.json({ ok: true, affected });
  } catch (err) {
    return handleRouteError(err);
  }
}
