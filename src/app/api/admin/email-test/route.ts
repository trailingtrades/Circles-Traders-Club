import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { sendTestEmail, smtpConfigured } from "@/lib/mail";
import { enforceRateLimit, handleRouteError } from "@/lib/api-helpers";

// POST /api/admin/email-test — sends a test email to the logged-in admin and
// returns the raw SMTP outcome so misconfiguration is visible in the UI.
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if ("response" in guard) return guard.response;

    const limited = await enforceRateLimit("email-test", 5, 10 * 60_000);
    if (limited) return limited;

    const config = {
      configured: smtpConfigured(),
      transport: process.env.BREVO_API_KEY ? "Brevo API (HTTPS)" : "SMTP",
      host: process.env.BREVO_API_KEY ? "api.brevo.com" : process.env.SMTP_HOST || "(empty)",
      port: process.env.BREVO_API_KEY ? "443" : process.env.SMTP_PORT || "587",
      user: process.env.SMTP_USER ? "(set)" : "(empty)",
      pass: process.env.SMTP_PASS ? "(set)" : "(empty)",
      from: process.env.SMTP_FROM || "(empty)",
    };

    const result = await sendTestEmail(guard.admin.email);
    return NextResponse.json({ ...result, to: guard.admin.email, config });
  } catch (err) {
    return handleRouteError(err);
  }
}
