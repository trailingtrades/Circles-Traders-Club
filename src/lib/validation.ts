import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long");

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .refine((s) => !Number.isNaN(new Date(`${s}T00:00:00`).getTime()), "Invalid date");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  remember: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

const feeAmount = z.coerce.number().int().min(0).max(100_000_000);

export const studentCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  mobile: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,19}$/, "Invalid mobile number")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  courseId: z.string().trim().min(1).optional().or(z.literal("").transform(() => undefined)),
  subscriptionStart: dateString,
  subscriptionEnd: dateString,
  feeTotal: feeAmount.optional().default(0),
  feePaid: feeAmount.optional().default(0),
  notes: z.string().max(2000).optional().or(z.literal("").transform(() => undefined)),
  sendWelcomeEmail: z.boolean().optional().default(true),
});

export const studentUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional().or(z.literal("").transform(() => undefined)),
  mobile: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,19}$/, "Invalid mobile number")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  courseId: z.string().trim().nullable().optional().or(z.literal("").transform(() => null)),
  subscriptionStart: dateString.optional(),
  subscriptionEnd: dateString.optional(),
  feeTotal: feeAmount.optional(),
  feePaid: feeAmount.optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED", "REVOKED"]).optional(),
});

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(2000)
  .refine((u) => u.startsWith("https://") || u.startsWith("http://"), "Must be an http(s) URL");

export const materialCreateSchema = z
  .object({
    courseId: z.string().trim().min(1),
    title: z.string().trim().min(2).max(200),
    description: z.string().max(1000).optional().or(z.literal("").transform(() => undefined)),
    type: z.enum(["HTML", "VIDEO", "SHEET", "LINK"]),
    contentPath: z.string().trim().max(300).optional().or(z.literal("").transform(() => undefined)),
    url: httpsUrl.optional().or(z.literal("").transform(() => undefined)),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
    isActive: z.boolean().optional().default(true),
  })
  .refine((m) => (m.type === "HTML" ? !!m.contentPath : !!m.url), {
    message: "HTML materials need a contentPath; other types need a URL",
  });

export const materialUpdateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  type: z.enum(["HTML", "VIDEO", "SHEET", "LINK"]).optional(),
  contentPath: z.string().trim().max(300).nullable().optional(),
  url: httpsUrl.nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const bulkActionSchema = z.object({
  action: z.enum(["extend", "disable", "enable", "delete", "force_logout"]),
  ids: z.array(z.string().min(1)).min(1).max(1000),
  // extend only:
  extendDays: z.number().int().min(1).max(3650).optional(),
});

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(["all", "active", "expired", "disabled", "revoked", "due"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export function parseDateOnly(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

// Formats a stored date back to YYYY-MM-DD in SERVER-LOCAL time. Dates are
// stored at local midnight, so UTC-based toISOString() would show the
// previous day on timezones ahead of UTC (e.g. IST).
export function formatDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
