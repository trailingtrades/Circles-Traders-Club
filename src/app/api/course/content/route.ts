import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accessState } from "@/lib/subscription";
import { loadCourseHtml, injectProtections } from "@/lib/course-content";
import { logActivity } from "@/lib/activity";

// The ONLY way to reach the learning material. Requires a valid session AND
// an active (unexpired, non-disabled) subscription. The file itself lives
// outside the public web root, so there is no direct URL to it.
export async function GET() {
  const current = await getStudentSession();
  if (!current) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { student } = current;

  const state = accessState(student);
  if (state !== "ok") {
    await logActivity({
      type: "ACCESS_DENIED_EXPIRED",
      studentId: student.id,
      detail: `Content access denied: ${state}`,
    });
    return new NextResponse("Subscription expired or access revoked", { status: 403 });
  }

  const course = student.courseId
    ? await prisma.course.findUnique({ where: { id: student.courseId } })
    : await prisma.course.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });

  if (!course || !course.isActive) {
    return new NextResponse("No course assigned. Please contact the institute.", { status: 404 });
  }

  let html: string;
  try {
    if (course.contentPath) {
      // Legacy course-level file (the seeded playbook).
      html = await loadCourseHtml(course.contentPath, student);
    } else {
      // Fall back to the first HTML material (DB-stored or file-based).
      const firstHtml = await prisma.material.findFirst({
        where: { courseId: course.id, type: "HTML", isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      if (firstHtml?.htmlContent) {
        html = injectProtections(firstHtml.htmlContent, student);
      } else if (firstHtml?.contentPath) {
        html = await loadCourseHtml(firstHtml.contentPath, student);
      } else {
        return new NextResponse("This course has no study material yet.", { status: 404 });
      }
    }
  } catch (err) {
    console.error("Failed to load course content:", err);
    return new NextResponse("Course content unavailable", { status: 500 });
  }

  await logActivity({
    type: "CONTENT_ACCESSED",
    studentId: student.id,
    detail: `Course: ${course.name}`,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Never cache — a shared/back-button copy must not outlive the session.
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      // Renderable only inside our own pages (the /course iframe).
      "Content-Security-Policy": "frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
