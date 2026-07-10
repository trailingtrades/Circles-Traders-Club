import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accessState, daysRemaining } from "@/lib/subscription";
import { jsonError } from "@/lib/api-helpers";

export async function GET() {
  const current = await getStudentSession();
  if (!current) return jsonError(401, "Not authenticated");

  const { student } = current;
  const course = student.courseId
    ? await prisma.course.findUnique({ where: { id: student.courseId } })
    : null;

  return NextResponse.json({
    fullName: student.fullName,
    email: student.email,
    courseName: course?.name ?? null,
    subscriptionStart: student.subscriptionStart,
    subscriptionEnd: student.subscriptionEnd,
    daysRemaining: daysRemaining(student),
    accessState: accessState(student),
  });
}
