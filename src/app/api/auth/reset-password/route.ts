import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { hashToken } from "@/lib/tokens";
import { logActivity } from "@/lib/activity";
import { resetPasswordSchema } from "@/lib/validation";
import { assertSameOrigin, enforceRateLimit, handleRouteError, jsonError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const csrf = assertSameOrigin(req);
    if (csrf) return csrf;

    const limited = await enforceRateLimit("reset", 10, 60 * 60_000);
    if (limited) return limited;

    const { token, password } = resetPasswordSchema.parse(await req.json());

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { student: true },
    });

    if (!record || !record.student || record.usedAt || record.expiresAt < new Date()) {
      return jsonError(400, "This reset link is invalid or has expired. Please request a new one.");
    }

    await prisma.$transaction([
      prisma.student.update({
        where: { id: record.student.id },
        data: { passwordHash: await hashPassword(password) },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Changing the password revokes every existing session for the account.
      prisma.session.deleteMany({ where: { studentId: record.student.id } }),
    ]);

    await logActivity({ type: "PASSWORD_RESET_COMPLETED", studentId: record.student.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
