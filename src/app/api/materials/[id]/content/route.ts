import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { accessState } from "@/lib/subscription";
import { accessibleMaterial } from "@/lib/student-materials";
import { renderMaterialHtml } from "@/lib/course-content";
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
  // Per-student authorisation (course membership or explicit custom grant).
  const material = await accessibleMaterial(student, id);
  if (!material || material.type !== "HTML") {
    return new NextResponse("Not found", { status: 404 });
  }

  let html: string | null;
  try {
    html = await renderMaterialHtml(material, student);
  } catch (err) {
    console.error("Failed to load material content:", err);
    return new NextResponse("Content unavailable", { status: 500 });
  }
  if (!html) {
    return new NextResponse("This material has no content yet.", { status: 404 });
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
