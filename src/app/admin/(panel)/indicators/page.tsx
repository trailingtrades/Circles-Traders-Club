import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import IndicatorsManager from "@/components/admin/IndicatorsManager";

export const metadata: Metadata = { title: "Indicators" };
export const dynamic = "force-dynamic";

export default async function IndicatorsPage() {
  const indicators = await prisma.indicator.findMany({
    include: { _count: { select: { studentGrants: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Indicators</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500 dark:text-ink-400">
        The catalog of indicators you offer. Grant them per student — students see which ones
        are included in their plan on their dashboard.
      </p>
      <IndicatorsManager initialIndicators={indicators} />
    </div>
  );
}
