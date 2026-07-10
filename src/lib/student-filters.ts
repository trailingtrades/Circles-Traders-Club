import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Dates are stored at local midnight; a subscription is valid through the end
// of its end date, so "not expired" ⇔ subscriptionEnd >= start of today.
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function buildStudentWhere(params: {
  q?: string;
  status?: "all" | "active" | "expired" | "disabled" | "revoked" | "due";
}): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {};
  const today = startOfToday();

  if (params.q) {
    where.OR = [
      { fullName: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { mobile: { contains: params.q } },
    ];
  }

  switch (params.status) {
    case "active":
      where.status = "ACTIVE";
      where.subscriptionEnd = { gte: today };
      break;
    case "expired":
      where.status = "ACTIVE";
      where.subscriptionEnd = { lt: today };
      break;
    case "disabled":
      where.status = "DISABLED";
      break;
    case "revoked":
      where.status = "REVOKED";
      break;
    case "due":
      // Students who still owe money: feeTotal > feePaid
      where.feeTotal = { gt: prisma.student.fields.feePaid };
      break;
  }
  return where;
}
