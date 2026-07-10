import type { Metadata } from "next";
import StudentsTable from "@/components/admin/StudentsTable";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const valid = ["all", "active", "expired", "disabled", "revoked"];
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Students</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500 dark:text-ink-400">
        Search, filter and manage student accounts and subscriptions.
      </p>
      <StudentsTable initialStatus={valid.includes(status || "") ? status : "all"} />
    </div>
  );
}
