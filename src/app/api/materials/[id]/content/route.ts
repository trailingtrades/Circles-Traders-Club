import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accessState } from "@/lib/subscription";
import { loadCourseHtml } from "@/lib/course-content";
import { logActivity } from "@/lib/activity";

// Serves an HTML material — same gating as /api/course/content: valid session,
// active subscription, material belongs to the student's course.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getStudentSession();
  if (!current) return new NextResponse("Unauthorized", { status: 401 });
  const { student } = current;

  const state = accessState(student);
  if (state !== "ok") {
    await logActivity({
      type: "ACCESS_DENIED_EXPIRED",
      studentId: student.id,
      detail: `Material access denied: ${state}`,
    });
    return new NextResponse("Subscription expired or access revoked", { status: 403 });
  }

  const { id } = await params;
  const material = await prisma.material.findUnique({ where: { id }, include: { course: true } });
  if (!material || !material.isActive || material.type !== "HTML" || !material.contentPath) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Authorisation: the material must belong to the student's course
  // (or the default course when the student has none assigned).
  const studentCourseId =
    student.courseId ??
    (
      await prisma.course.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    )?.id;
  if (material.courseId !== studentCourseId || !material.course.isActive) {
    return new NextResponse("Not found", { status: 404 });
  }

  let html: string;
  try {
    html = await loadCourseHtml(material.contentPath, student);
  } catch (err) {
    console.error("Failed to load material content:", err);
    return new NextResponse("Content unavailable", { status: 500 });
  }

  await logActivity({
    type: "CONTENT_ACCESSED",
    studentId: student.id,
    detail: `Material: ${material.title}`,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
