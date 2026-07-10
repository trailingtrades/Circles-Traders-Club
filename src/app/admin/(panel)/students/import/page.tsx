import type { Metadata } from "next";
import ImportCsv from "@/components/admin/ImportCsv";

export const metadata: Metadata = { title: "Import Students" };

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Bulk import (CSV)</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500 dark:text-ink-400">
        Upload a CSV to create many student accounts at once.
      </p>
      <ImportCsv />
    </div>
  );
}
