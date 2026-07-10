import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getStudentSession } from "@/lib/auth";
import { accessState, daysRemaining } from "@/lib/subscription";
import { accessibleMaterial } from "@/lib/student-materials";
import { embedUrlFor } from "@/lib/embeds";
import { logActivity } from "@/lib/activity";
import LogoutButton from "@/components/LogoutButton";
import IdleLogout from "@/components/IdleLogout";

export const metadata: Metadata = { title: "Learning Material" };
export const dynamic = "force-dynamic";

// Viewer for a single material. HTML types stream through the protected
// content API; VIDEO/SHEET types embed inside this authenticated page;
// LINK types (and non-embeddable URLs) show an open button.
export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getStudentSession();
  if (!current) redirect("/login");
  const { student } = current;
  if (accessState(student) !== "ok") redirect("/expired");

  const { id } = await params;
  const material = await accessibleMaterial(student, id);
  if (!material) notFound();

  const days = daysRemaining(student);

  let body: React.ReactNode;
  if (material.type === "HTML") {
    body = (
      <iframe
        src={`/api/materials/${material.id}/content`}
        title={material.title}
        className="w-full flex-1 border-0 bg-[#0e1117]"
        sandbox="allow-scripts allow-same-origin"
      />
    );
  } else {
    const embed = material.url ? embedUrlFor(material.type, material.url) : null;
    if (embed) {
      // Log embedded views here (HTML views are logged by the content API).
      await logActivity({
        type: "CONTENT_ACCESSED",
        studentId: student.id,
        detail: `Material: ${material.title}`,
      });
      body = (
        <iframe
          src={embed}
          title={material.title}
          className="w-full flex-1 border-0 bg-white"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      );
    } else {
      body = (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="max-w-md text-sm text-ink-300">
            This resource opens in a new tab.
          </p>
          <a
            href={material.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            🔗 Open {material.title}
          </a>
        </div>
      );
    }
  }

  return (
    <main className="flex h-screen flex-col bg-ink-950">
      <IdleLogout minutes={45} />
      <header className="flex items-center justify-between gap-3 border-b border-ink-700 bg-ink-900 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="shrink-0 text-sm font-semibold text-brand-500 hover:text-brand-400">
            ← Dashboard
          </Link>
          <span className="truncate text-sm font-semibold text-white">{material.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`hidden text-xs sm:inline ${days <= 7 ? "text-amber-400" : "text-ink-400"}`}>
            {days <= 7 ? `⚠️ ${days} day${days === 1 ? "" : "s"} left` : student.fullName}
          </span>
          <LogoutButton className="btn-secondary !px-3 !py-1 text-xs" />
        </div>
      </header>
      {body}
    </main>
  );
}
