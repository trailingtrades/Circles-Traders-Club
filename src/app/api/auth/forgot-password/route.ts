import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";
import { logActivity } from "@/lib/activity";
import { forgotPasswordSchema } from "@/lib/validation";
import { assertSameOrigin, enforceRateLimit, handleRouteError } from "@/lib/api-helpers";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const csrf = assertSameOrigin(req);
    if (csrf) return csrf;

    const limited =
      (await enforceRateLimit("forgot", 3, 60 * 60_000)) ||
      (await enforceRateLimit("forgot-day", 10, 24 * 60 * 60_000));
    if (limited) return limited;

    const { email } = forgotPasswordSchema.parse(await req.json());
    const student = await prisma.student.findUnique({ where: { email } });

    // Always return the same response — never reveal whether an email exists.
    if (student && student.status === "ACTIVE") {
      // Invalidate previous tokens; only the newest link works.
      await prisma.passwordResetToken.deleteMany({ where: { studentId: student.id } });
      const token = generateToken();
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: hashToken(token),
          studentId: student.id,
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      });
      await sendPasswordResetEmail({ to: student.email, name: student.fullName, token });
      await logActivity({ type: "PASSWORD_RESET_REQUESTED", studentId: student.id });
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
