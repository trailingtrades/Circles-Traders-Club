import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Admin, Session, Student } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/tokens";
import { getRequestInfo } from "@/lib/request-info";

export const STUDENT_COOKIE = "ctc_student_session";
export const ADMIN_COOKIE = "ctc_admin_session";

// Session lifetimes
const STUDENT_TTL_MS = 12 * 60 * 60 * 1000; //           12 h absolute
const STUDENT_REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 d absolute ("remember me")
const ADMIN_TTL_MS = 12 * 60 * 60 * 1000;
const IDLE_TIMEOUT_MS =
  (parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || "45", 10) || 45) * 60 * 1000;
const REMEMBER_IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 d idle for remembered sessions

const SINGLE_SESSION =
  (process.env.ENFORCE_SINGLE_STUDENT_SESSION || "true").toLowerCase() !== "false";

function cookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : {}),
  };
}

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------
export async function createStudentSession(studentId: string, remember: boolean) {
  const info = await getRequestInfo();
  const token = generateToken();
  const ttl = remember ? STUDENT_REMEMBER_TTL_MS : STUDENT_TTL_MS;

  if (SINGLE_SESSION) {
    // One active session per student: signing in logs out other devices.
    await prisma.session.deleteMany({ where: { studentId } });
  }

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      studentId,
      remember,
      ip: info.ip,
      userAgent: info.userAgent,
      device: info.device,
      browser: info.browser,
      expiresAt: new Date(Date.now() + ttl),
    },
  });

  const store = await cookies();
  // Without "remember me" the cookie is a browser-session cookie.
  store.set(STUDENT_COOKIE, token, cookieOptions(remember ? ttl / 1000 : undefined));
}

export async function createAdminSession(adminId: string) {
  const info = await getRequestInfo();
  const token = generateToken();

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      adminId,
      ip: info.ip,
      userAgent: info.userAgent,
      device: info.device,
      browser: info.browser,
      expiresAt: new Date(Date.now() + ADMIN_TTL_MS),
    },
  });

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, cookieOptions());
}

// ---------------------------------------------------------------------------
// Session validation
// ---------------------------------------------------------------------------
async function validateSession(token: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session) return null;

  const now = Date.now();
  const idleLimit = session.remember ? REMEMBER_IDLE_TIMEOUT_MS : IDLE_TIMEOUT_MS;
  if (now > session.expiresAt.getTime() || now - session.lastActiveAt.getTime() > idleLimit) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Sliding activity marker (throttled to one write per minute).
  if (now - session.lastActiveAt.getTime() > 60_000) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastActiveAt: new Date(now) } })
      .catch(() => {});
  }
  return session;
}

export const getStudentSession = cache(
  async (): Promise<{ student: Student; session: Session } | null> => {
    const store = await cookies();
    const token = store.get(STUDENT_COOKIE)?.value;
    if (!token) return null;
    const session = await validateSession(token);
    if (!session?.studentId) return null;
    const student = await prisma.student.findUnique({ where: { id: session.studentId } });
    if (!student) return null;
    return { student, session };
  }
);

export const getAdminSession = cache(
  async (): Promise<{ admin: Admin; session: Session } | null> => {
    const store = await cookies();
    const token = store.get(ADMIN_COOKIE)?.value;
    if (!token) return null;
    const session = await validateSession(token);
    if (!session?.adminId) return null;
    const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
    if (!admin) return null;
    return { admin, session };
  }
);

// ---------------------------------------------------------------------------
// Session destruction
// ---------------------------------------------------------------------------
export async function destroySession(cookieName: string) {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(cookieName);
}

export async function forceLogoutStudent(studentId: string): Promise<number> {
  const res = await prisma.session.deleteMany({ where: { studentId } });
  return res.count;
}

// Housekeeping: remove expired sessions opportunistically.
export async function pruneExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
}
