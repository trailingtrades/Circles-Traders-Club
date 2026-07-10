import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { forceLogoutStudent } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { handleRouteError } from "@/lib/api-helpers";

// POST /api/admin/students/:id/force-logout — terminate all live sessions
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const count = await forceLogoutStudent(id);
    await logActivity({
      type: "FORCED_LOGOUT",
      adminId: guard.admin.id,
      studentId: id,
      detail: `Terminated ${count} session(s)`,
    });
    return NextResponse.json({ ok: true, sessionsTerminated: count });
  } catch (err) {
    return handleRouteError(err);
  }
}
