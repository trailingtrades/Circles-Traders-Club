import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getStudentSession } from "@/lib/auth";
import { accessState } from "@/lib/subscription";
import AuthShell from "@/components/AuthShell";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = { title: "Subscription Expired" };
export const dynamic = "force-dynamic";

export default async function ExpiredPage() {
  const current = await getStudentSession();
  if (!current) redirect("/login");

  const { student } = current;
  const state = accessState(student);
  if (state === "ok") redirect("/dashboard");

  const messages: Record<string, { title: string; body: string }> = {
    expired: {
      title: "Your subscription has expired",
      body: `Your access ended on ${student.subscriptionEnd.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}. Please contact the institute to renew your access.`,
    },
    not_started: {
      title: "Your subscription hasn't started yet",
      body: `Your access begins on ${student.subscriptionStart.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}. Please check back then, or contact the institute if this looks wrong.`,
    },
    disabled: {
      title: "Your account is disabled",
      body: "Please contact the institute to restore your access.",
    },
    revoked: {
      title: "Your access has been revoked",
      body: "Please contact the institute if you believe this is a mistake.",
    },
  };
  const m = messages[state] ?? messages.expired;

  return (
    <AuthShell title={m.title}>
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{m.body}</p>
        <div className="rounded-lg bg-ink-100 px-4 py-3 text-sm text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          📞 Contact the institute to renew:{" "}
          <b>{process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@circlestradersclub.com"}</b>
        </div>
        <LogoutButton className="btn-secondary w-full" />
      </div>
    </AuthShell>
  );
}
