import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { handleRouteError } from "@/lib/api-helpers";
import { toCsv } from "@/lib/csv";
import { formatDateOnly, listQuerySchema } from "@/lib/validation";
import { buildStudentWhere, startOfToday } from "@/lib/student-filters";

// GET /api/admin/students/export?q=&status= — download the (filtered) student
// list as CSV. Password hashes are never exported.
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const sp = req.nextUrl.searchParams;
    const query = listQuerySchema.parse(Object.fromEntries(sp.entries()));
    const students = await prisma.student.findMany({
      where: buildStudentWhere(query),
      include: { course: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const today = startOfToday();
    const rows: (string | null)[][] = [
      [
        "fullName", "email", "mobile", "course", "status", "subscriptionStart",
        "subscriptionEnd", "accessState", "lastLoginAt", "notes", "createdAt",
      ],
      ...students.map((s) => [
        s.fullName,
        s.email,
        s.mobile,
        s.course?.name ?? "",
        s.status,
        formatDateOnly(s.subscriptionStart),
        formatDateOnly(s.subscriptionEnd),
        s.status !== "ACTIVE" ? s.status.toLowerCase() : s.subscriptionEnd >= today ? "active" : "expired",
        s.lastLoginAt ? s.lastLoginAt.toISOString() : "",
        s.notes ?? "",
        s.createdAt.toISOString(),
      ]),
    ];

    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
