import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { hashPassword } from "@/lib/password";
import { forceLogoutStudent } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { formatDateOnly, parseDateOnly, studentUpdateSchema } from "@/lib/validation";
import type { ActivityType, Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/students/:id
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, name: true } },
        materialGrants: { select: { materialId: true } },
        indicatorGrants: { select: { indicatorId: true } },
        sessions: {
          select: { id: true, ip: true, device: true, browser: true, lastActiveAt: true, createdAt: true },
          orderBy: { lastActiveAt: "desc" },
        },
      },
    });
    if (!student) return jsonError(404, "Student not found");
    const { passwordHash: _ph, ...safe } = student;
    return NextResponse.json({ student: safe });
  } catch (err) {
    return handleRouteError(err);
  }
}

// PUT /api/admin/students/:id — edit profile, dates, password, status
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const body = studentUpdateSchema.parse(await req.json());

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return jsonError(404, "Student not found");

    if (body.email && body.email !== student.email) {
      const clash = await prisma.student.findUnique({ where: { email: body.email } });
      if (clash) return jsonError(409, "Another student already uses this email");
    }

    const data: Prisma.StudentUpdateInput = {};
    if (body.fullName !== undefined) data.fullName = body.fullName;
    if (body.email !== undefined) data.email = body.email;
    if (body.mobile !== undefined) data.mobile = body.mobile;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.status !== undefined) data.status = body.status;
    if (body.courseId !== undefined) {
      data.course = body.courseId ? { connect: { id: body.courseId } } : { disconnect: true };
    }
    if (body.subscriptionStart !== undefined) data.subscriptionStart = parseDateOnly(body.subscriptionStart);
    if (body.subscriptionEnd !== undefined) data.subscriptionEnd = parseDateOnly(body.subscriptionEnd);
    if (body.feeTotal !== undefined) data.feeTotal = body.feeTotal;
    if (body.feePaid !== undefined) data.feePaid = body.feePaid;
    if (body.materialAccess !== undefined) data.materialAccess = body.materialAccess;
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const newStart = (data.subscriptionStart as Date) ?? student.subscriptionStart;
    const newEnd = (data.subscriptionEnd as Date) ?? student.subscriptionEnd;
    if (newEnd < newStart) return jsonError(400, "Subscription end date must be after the start date");

    const updated = await prisma.student.update({ where: { id }, data });

    // Replace the custom-grant set when a selection is provided.
    if (body.materialIds !== undefined) {
      const validIds = await prisma.material.findMany({
        where: { id: { in: body.materialIds } },
        select: { id: true },
      });
      await prisma.$transaction([
        prisma.studentMaterialAccess.deleteMany({ where: { studentId: id } }),
        prisma.studentMaterialAccess.createMany({
          data: validIds.map((m) => ({ studentId: id, materialId: m.id })),
          skipDuplicates: true,
        }),
      ]);
    }

    if (body.indicatorIds !== undefined) {
      const validIndicators = await prisma.indicator.findMany({
        where: { id: { in: body.indicatorIds } },
        select: { id: true },
      });
      await prisma.$transaction([
        prisma.studentIndicatorAccess.deleteMany({ where: { studentId: id } }),
        prisma.studentIndicatorAccess.createMany({
          data: validIndicators.map((i) => ({ studentId: id, indicatorId: i.id })),
          skipDuplicates: true,
        }),
      ]);
    }

    // Status change or password change kills live sessions immediately.
    if (body.password || (body.status && body.status !== "ACTIVE")) {
      await forceLogoutStudent(id);
    }

    const events: { type: ActivityType; detail: string }[] = [];
    if (body.password) events.push({ type: "PASSWORD_CHANGED_BY_ADMIN", detail: "Password reset by admin" });
    if (body.status === "DISABLED") events.push({ type: "STUDENT_DISABLED", detail: "Account disabled" });
    if (body.status === "REVOKED") events.push({ type: "STUDENT_REVOKED", detail: "Access revoked" });
    if (body.status === "ACTIVE" && student.status !== "ACTIVE")
      events.push({ type: "STUDENT_ENABLED", detail: "Account re-enabled" });
    if (
      body.subscriptionEnd !== undefined &&
      parseDateOnly(body.subscriptionEnd).getTime() !== student.subscriptionEnd.getTime()
    ) {
      events.push({
        type: "SUBSCRIPTION_EXTENDED",
        detail: `Subscription end: ${formatDateOnly(student.subscriptionEnd)} → ${body.subscriptionEnd}`,
      });
    }
    if (events.length === 0) events.push({ type: "STUDENT_UPDATED", detail: `Updated ${updated.email}` });
    for (const e of events) {
      await logActivity({ type: e.type, adminId: guard.admin.id, studentId: id, detail: e.detail });
    }

    const { passwordHash: _ph, ...safe } = updated;
    return NextResponse.json({ student: safe });
  } catch (err) {
    return handleRouteError(err);
  }
}

// DELETE /api/admin/students/:id
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return jsonError(404, "Student not found");

    await prisma.student.delete({ where: { id } }); // sessions/tokens cascade
    await logActivity({
      type: "STUDENT_DELETED",
      adminId: guard.admin.id,
      detail: `Deleted ${student.email} (${student.fullName})`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
