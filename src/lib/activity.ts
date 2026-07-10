import type { ActivityType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRequestInfo } from "@/lib/request-info";

// Writes an audit-trail entry. Never throws — logging must not break the
// action being logged.
export async function logActivity(params: {
  type: ActivityType;
  studentId?: string | null;
  adminId?: string | null;
  detail?: string;
}) {
  try {
    const info = await getRequestInfo();
    await prisma.activityLog.create({
      data: {
        type: params.type,
        studentId: params.studentId ?? null,
        adminId: params.adminId ?? null,
        detail: params.detail,
        ip: info.ip,
        userAgent: info.userAgent.slice(0, 512),
        device: info.device,
        browser: info.browser,
      },
    });
  } catch (err) {
    console.error("activity log failed", err);
  }
}
