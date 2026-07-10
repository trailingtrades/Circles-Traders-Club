import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";
import { getStudentSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Student Login" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getStudentSession();
  if (session) redirect("/dashboard");

  return (
    <AuthShell title="Student Login" subtitle="Sign in to access your learning material.">
      <Suspense>
        <LoginForm endpoint="/api/auth/login" />
      </Suspense>
    </AuthShell>
  );
}
