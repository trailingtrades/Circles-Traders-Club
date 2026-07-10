import { NextRequest, NextResponse } from "next/server";
import type { ReminderKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendExpiredEmail, sendExpiryReminderEmail } from "@/lib/mail";
import { daysRemaining, isSubscriptionActive } from "@/lib/subscription";

export const maxDuration = 60;

// GET /api/cron/reminders — run daily (Vercel Cron, GitHub Actions, or any
// scheduler). Sends 7/3/1-day expiry reminders and the "expired" notice,
// each at most once per student per subscription period.
//
// Protect with: Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const soonCutoff = new Date(Date.now() + 8 * 86_400_000);
  const recentPast = new Date(Date.now() - 3 * 86_400_000);

  // Students whose subscription ends within 8 days or ended in the last 3.
  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      subscriptionEnd: { lte: soonCutoff, gte: recentPast },
    },
    include: { remindersSent: true },
  });

  let sent = 0;
  for (const student of students) {
    const alreadySent = (kind: ReminderKind) =>
      student.remindersSent.some(
        (r) => r.kind === kind && r.subscriptionEnd.getTime() === student.subscriptionEnd.getTime()
      );

    let kind: ReminderKind | null = null;
    if (!isSubscriptionActive(student)) {
      if (!alreadySent("EXPIRED")) kind = "EXPIRED";
    } else {
      const days = daysRemaining(student);
      if (days <= 1 && !alreadySent("DAYS_1")) kind = "DAYS_1";
      else if (days <= 3 && !alreadySent("DAYS_3")) kind = "DAYS_3";
      else if (days <= 7 && !alreadySent("DAYS_7")) kind = "DAYS_7";
    }
    if (!kind) continue;

    if (kind === "EXPIRED") {
      await sendExpiredEmail({
        to: student.email,
        name: student.fullName,
        subscriptionEnd: student.subscriptionEnd,
      });
    } else {
      await sendExpiryReminderEmail({
        to: student.email,
        name: student.fullName,
        daysLeft: daysRemaining(student),
        subscriptionEnd: student.subscriptionEnd,
      });
    }

    await prisma.reminderSent.create({
      data: { studentId: student.id, kind, subscriptionEnd: student.subscriptionEnd },
    });
    await prisma.activityLog.create({
      data: {
        type: "REMINDER_EMAIL_SENT",
        studentId: student.id,
        detail: `Reminder ${kind} sent to ${student.email}`,
      },
    });
    sent++;
  }

  // Opportunistic cleanup of expired sessions and stale reset tokens.
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  return NextResponse.json({ ok: true, checked: students.length, sent });
}
