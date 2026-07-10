import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, dummyVerify } from "@/lib/password";
import { createStudentSession, pruneExpiredSessions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { loginSchema } from "@/lib/validation";
import { assertSameOrigin, enforceRateLimit, handleRouteError, jsonError } from "@/lib/api-helpers";
import { accessState } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  try {
    const csrf = assertSameOrigin(req);
    if (csrf) return csrf;

    const body = loginSchema.parse(await req.json());

    // 5 attempts / 15 min per IP+email, and 20 / 15 min per IP overall.
    const limited =
      (await enforceRateLimit("login-email", 5, 15 * 60_000, body.email)) ||
      (await enforceRateLimit("login-ip", 20, 15 * 60_000));
    if (limited) return limited;

    const student = await prisma.student.findUnique({
      where: { email: body.email },
      include: { course: true },
    });

    if (!student) {
      await dummyVerify(); // keep timing consistent with the real-hash path
      await logActivity({ type: "STUDENT_LOGIN_FAILED", detail: `Unknown email: ${body.email}` });
      return jsonError(401, "Invalid email or password");
    }

    const valid = await verifyPassword(body.password, student.passwordHash);
    if (!valid) {
      await logActivity({ type: "STUDENT_LOGIN_FAILED", studentId: student.id, detail: "Wrong password" });
      return jsonError(401, "Invalid email or password");
    }

    const state = accessState(student);
    if (state === "disabled" || state === "revoked") {
      await logActivity({
        type: "STUDENT_LOGIN_FAILED",
        studentId: student.id,
        detail: `Account ${state}`,
      });
      return jsonError(403, "Your account has been disabled. Please contact the institute.");
    }

    // Expired subscriptions may still log in — they see the renewal page,
    // never the content.
    await createStudentSession(student.id, body.remember);
    await prisma.student.update({
      where: { id: student.id },
      data: { lastLoginAt: new Date() },
    });
    await logActivity({ type: "STUDENT_LOGIN", studentId: student.id });
    void pruneExpiredSessions();

    return NextResponse.json({
      ok: true,
      redirect: state === "ok" ? "/dashboard" : "/expired",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
