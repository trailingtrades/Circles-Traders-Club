import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";
import { getAdminSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin Login" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <AuthShell title="Admin Login" subtitle="Restricted area — institute staff only.">
      <Suspense>
        <LoginForm endpoint="/api/admin/login" showRemember={false} showForgot={false} />
      </Suspense>
    </AuthShell>
  );
}
