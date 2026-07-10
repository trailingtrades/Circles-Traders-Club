import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { hashPassword } from "@/lib/password";
import { logActivity } from "@/lib/activity";
import { sendWelcomeEmail } from "@/lib/mail";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { listQuerySchema, parseDateOnly, studentCreateSchema } from "@/lib/validation";
import { buildStudentWhere } from "@/lib/student-filters";

// GET /api/admin/students?q=&status=&page=&perPage= — search, filter, paginate
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const sp = req.nextUrl.searchParams;
    const query = listQuerySchema.parse(Object.fromEntries(sp.entries()));
    const where = buildStudentWhere(query);

    const [total, students] = await prisma.$transaction([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: { course: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
    ]);

    return NextResponse.json({
      total,
      page: query.page,
      perPage: query.perPage,
      students: students.map(({ passwordHash: _ph, ...s }) => s),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

// POST /api/admin/students — create a student
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const body = studentCreateSchema.parse(await req.json());
    const start = parseDateOnly(body.subscriptionStart);
    const end = parseDateOnly(body.subscriptionEnd);
    if (end < start) return jsonError(400, "Subscription end date must be after the start date");

    const existing = await prisma.student.findUnique({ where: { email: body.email } });
    if (existing) return jsonError(409, "A student with this email already exists");

    let courseId = body.courseId ?? null;
    if (!courseId) {
      const defaultCourse = await prisma.course.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      courseId = defaultCourse?.id ?? null;
    }

    const student = await prisma.student.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        mobile: body.mobile,
        courseId,
        subscriptionStart: start,
        subscriptionEnd: end,
        feeTotal: body.feeTotal,
        feePaid: body.feePaid,
        notes: body.notes,
      },
      include: { course: { select: { name: true } } },
    });

    await logActivity({
      type: "STUDENT_CREATED",
      adminId: guard.admin.id,
      studentId: student.id,
      detail: `Created ${student.email}`,
    });

    if (body.sendWelcomeEmail) {
      await sendWelcomeEmail({
        to: student.email,
        name: student.fullName,
        courseName: student.course?.name,
        subscriptionEnd: student.subscriptionEnd,
      });
    }

    const { passwordHash: _ph, ...safe } = student;
    return NextResponse.json({ student: safe }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
