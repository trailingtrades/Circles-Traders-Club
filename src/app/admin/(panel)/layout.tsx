import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import Sidebar from "@/components/admin/Sidebar";
import IdleLogout from "@/components/IdleLogout";

export const dynamic = "force-dynamic";

// Every admin page lives inside this layout — the session check here plus the
// per-request checks in each API route mean no admin data renders without a
// valid admin session.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const current = await getAdminSession();
  if (!current) redirect("/admin/login");

  return (
    <div className="min-h-screen">
      <IdleLogout minutes={30} endpoint="/api/admin/logout" redirectTo="/admin/login?timeout=1" />
      <Sidebar adminName={current.admin.name} />
      <main className="p-4 md:ml-60 md:p-8">{children}</main>
    </div>
  );
}
