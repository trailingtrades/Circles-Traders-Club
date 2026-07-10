import type { Student } from "@prisma/client";

// A subscription is valid through the END of its end date (inclusive).
export function subscriptionEndOfDay(end: Date): Date {
  const d = new Date(end);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isSubscriptionActive(student: Pick<Student, "subscriptionEnd">): boolean {
  return new Date() <= subscriptionEndOfDay(student.subscriptionEnd);
}

export function daysRemaining(student: Pick<Student, "subscriptionEnd">): number {
  const ms = subscriptionEndOfDay(student.subscriptionEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export type AccessState = "ok" | "expired" | "disabled" | "revoked" | "not_started";

export function accessState(
  student: Pick<Student, "status" | "subscriptionStart" | "subscriptionEnd">
): AccessState {
  if (student.status === "REVOKED") return "revoked";
  if (student.status === "DISABLED") return "disabled";
  if (new Date() < new Date(student.subscriptionStart)) return "not_started";
  if (!isSubscriptionActive(student)) return "expired";
  return "ok";
}
