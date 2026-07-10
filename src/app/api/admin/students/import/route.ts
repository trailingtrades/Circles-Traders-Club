import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-guard";
import { hashPassword } from "@/lib/password";
import { logActivity } from "@/lib/activity";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { parseCsv } from "@/lib/csv";
import { studentCreateSchema } from "@/lib/validation";

export const maxDuration = 60;

// POST /api/admin/students/import — bulk-create students from CSV.
// Expected header:
//   fullName,email,password,mobile,subscriptionStart,subscriptionEnd,notes
// Dates in YYYY-MM-DD. mobile and notes may be empty.
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError(400, "Upload a CSV file in the 'file' field");
    if (file.size > 2 * 1024 * 1024) return jsonError(400, "CSV too large (max 2 MB)");

    const rows = parseCsv(await file.text());
    if (rows.length < 2) return jsonError(400, "CSV must contain a header row and at least one student");

    const header = rows[0].map((h) => h.trim());
    const required = ["fullName", "email", "password", "subscriptionStart", "subscriptionEnd"];
    for (const col of required) {
      if (!header.includes(col)) return jsonError(400, `Missing required CSV column: ${col}`);
    }
    const idx = (name: string) => header.indexOf(name);
    const cell = (row: string[], name: string) => {
      const i = idx(name);
      return i >= 0 ? (row[i] ?? "").trim() : "";
    };

    if (rows.length - 1 > 1000) return jsonError(400, "Max 1000 students per import");

    const defaultCourse = await prisma.course.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    const results = { created: 0, skipped: [] as { line: number; reason: string }[] };

    for (let r = 1; r < rows.length; r++) {
      const line = r + 1;
      const parsed = studentCreateSchema
        .omit({ sendWelcomeEmail: true, courseId: true })
        .safeParse({
          fullName: cell(rows[r], "fullName"),
          email: cell(rows[r], "email"),
          password: cell(rows[r], "password"),
          mobile: cell(rows[r], "mobile"),
          subscriptionStart: cell(rows[r], "subscriptionStart"),
          subscriptionEnd: cell(rows[r], "subscriptionEnd"),
          notes: cell(rows[r], "notes"),
        });
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        results.skipped.push({ line, reason: `${issue.path.join(".")}: ${issue.message}` });
        continue;
      }
      const d = parsed.data;
      const exists = await prisma.student.findUnique({ where: { email: d.email } });
      if (exists) {
        results.skipped.push({ line, reason: `Email already exists: ${d.email}` });
        continue;
      }
      await prisma.student.create({
        data: {
          fullName: d.fullName,
          email: d.email,
          passwordHash: await hashPassword(d.password),
          mobile: d.mobile,
          courseId: defaultCourse?.id ?? null,
          subscriptionStart: new Date(`${d.subscriptionStart}T00:00:00`),
          subscriptionEnd: new Date(`${d.subscriptionEnd}T00:00:00`),
          notes: d.notes,
        },
      });
      results.created++;
    }

    await logActivity({
      type: "BULK_OPERATION",
      adminId: guard.admin.id,
      detail: `CSV import: ${results.created} created, ${results.skipped.length} skipped`,
    });
    return NextResponse.json(results);
  } catch (err) {
    return handleRouteError(err);
  }
}
