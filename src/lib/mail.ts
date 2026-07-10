import nodemailer from "nodemailer";

// Email delivery via SMTP (any provider: Resend SMTP, SES, Brevo, Gmail
// workspace relay, etc.). If SMTP is not configured the message is logged to
// the server console instead — useful in development.

const APP_NAME = process.env.APP_NAME || "Circles Traders Club";

function getBaseUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e3e6ea">
    <div style="background:#101828;color:#f0b90b;padding:18px 24px;font-size:18px;font-weight:bold">${APP_NAME}</div>
    <div style="padding:24px;color:#1f2937;font-size:14px;line-height:1.6">
      <h2 style="margin:0 0 12px;font-size:17px;color:#101828">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:14px 24px;background:#f9fafb;color:#6b7280;font-size:12px">
      This is an automated message from ${APP_NAME}. Please do not share your login credentials.
    </div>
  </div></body></html>`;
}

export function smtpConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

type SendResult = { ok: boolean; error?: string };

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || `"${APP_NAME}" <no-reply@localhost>`;
  if (!transport) {
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    console.log(
      `[mail:dev] To: ${to} | Subject: ${subject}\n` +
        `${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n` +
        (links.length ? `[mail:dev] Links: ${links.join(" ")}` : "")
    );
    return {
      ok: false,
      error: "SMTP is not configured (SMTP_HOST is empty) — the email was only printed to the server logs.",
    };
  }
  try {
    await transport.sendMail({ from, to, subject, html });
    return { ok: true };
  } catch (err) {
    // Email failures must not break the main flow; they are logged for ops.
    console.error(`[mail] failed to send "${subject}" to ${to}:`, err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Used by the admin panel's "Send test email" diagnostic.
export async function sendTestEmail(to: string): Promise<SendResult> {
  return send(
    to,
    `${APP_NAME} — test email ✔`,
    layout(
      "Email configuration test",
      `<p>If you're reading this, SMTP is configured correctly and ${APP_NAME} can send
       welcome emails, password resets and expiry reminders.</p>
       <p style="color:#6b7280">Sent ${new Date().toUTCString()}</p>`
    )
  );
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  courseName?: string;
  subscriptionEnd: Date;
}) {
  const url = getBaseUrl();
  await send(
    params.to,
    `Welcome to ${APP_NAME} — your account is ready`,
    layout(
      `Welcome, ${params.name}!`,
      `<p>Your student account has been created${params.courseName ? ` for <b>${params.courseName}</b>` : ""}.</p>
       <p>Login email: <b>${params.to}</b><br>
       Your password has been shared with you by the institute.</p>
       <p>Your subscription is valid until <b>${params.subscriptionEnd.toDateString()}</b>.</p>
       <p><a href="${url}/login" style="display:inline-block;background:#f0b90b;color:#101828;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Log in to your dashboard</a></p>
       <p style="color:#6b7280">If you did not expect this email, please contact the institute.</p>`
    )
  );
}

export async function sendPasswordResetEmail(params: { to: string; name: string; token: string }) {
  const url = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(params.token)}`;
  await send(
    params.to,
    `${APP_NAME} — password reset`,
    layout(
      "Reset your password",
      `<p>Hi ${params.name},</p>
       <p>We received a request to reset your password. This link is valid for <b>1 hour</b> and can be used once:</p>
       <p><a href="${url}" style="display:inline-block;background:#f0b90b;color:#101828;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Reset password</a></p>
       <p style="color:#6b7280">If you did not request this, you can safely ignore this email — your password will not change.</p>`
    )
  );
}

export async function sendExpiryReminderEmail(params: {
  to: string;
  name: string;
  daysLeft: number;
  subscriptionEnd: Date;
}) {
  await send(
    params.to,
    `${APP_NAME} — your subscription expires in ${params.daysLeft} day${params.daysLeft === 1 ? "" : "s"}`,
    layout(
      "Subscription expiring soon",
      `<p>Hi ${params.name},</p>
       <p>Your subscription expires on <b>${params.subscriptionEnd.toDateString()}</b> — that's in <b>${params.daysLeft} day${params.daysLeft === 1 ? "" : "s"}</b>.</p>
       <p>To continue accessing your study material without interruption, please contact the institute to renew.</p>`
    )
  );
}

export async function sendExpiredEmail(params: { to: string; name: string; subscriptionEnd: Date }) {
  await send(
    params.to,
    `${APP_NAME} — your subscription has expired`,
    layout(
      "Subscription expired",
      `<p>Hi ${params.name},</p>
       <p>Your subscription expired on <b>${params.subscriptionEnd.toDateString()}</b> and access to the study material has been paused.</p>
       <p>Please contact the institute to renew your access.</p>`
    )
  );
}
