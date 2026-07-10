import { NextRequest, NextResponse } from "next/server";
import { destroySession, getStudentSession, STUDENT_COOKIE } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { assertSameOrigin } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const current = await getStudentSession();
  if (current) {
    await logActivity({ type: "STUDENT_LOGOUT", studentId: current.student.id });
  }
  await destroySession(STUDENT_COOKIE);
  return NextResponse.json({ ok: true });
}
