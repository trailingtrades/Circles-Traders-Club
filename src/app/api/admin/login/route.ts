import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, dummyVerify } from "@/lib/password";
import { createAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { loginSchema } from "@/lib/validation";
import { assertSameOrigin, enforceRateLimit, handleRouteError, jsonError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const csrf = assertSameOrigin(req);
    if (csrf) return csrf;

    const body = loginSchema.parse(await req.json());

    // Stricter than student login: 5 attempts / 15 min per IP.
    const limited = await enforceRateLimit("admin-login", 5, 15 * 60_000);
    if (limited) return limited;

    const admin = await prisma.admin.findUnique({ where: { email: body.email } });
    if (!admin) {
      await dummyVerify();
      await logActivity({ type: "ADMIN_LOGIN_FAILED", detail: `Unknown admin email: ${body.email}` });
      return jsonError(401, "Invalid email or password");
    }

    const valid = await verifyPassword(body.password, admin.passwordHash);
    if (!valid) {
      await logActivity({ type: "ADMIN_LOGIN_FAILED", adminId: admin.id, detail: "Wrong password" });
      return jsonError(401, "Invalid email or password");
    }

    await createAdminSession(admin.id);
    await logActivity({ type: "ADMIN_LOGIN", adminId: admin.id });
    return NextResponse.json({ ok: true, redirect: "/admin" });
  } catch (err) {
    return handleRouteError(err);
  }
}
