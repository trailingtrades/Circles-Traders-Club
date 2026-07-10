import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, destroySession, getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { assertSameOrigin } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const current = await getAdminSession();
  if (current) {
    await logActivity({ type: "ADMIN_LOGOUT", adminId: current.admin.id });
  }
  await destroySession(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
