import "server-only";
import type { Admin } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { assertSameOrigin, jsonError } from "@/lib/api-helpers";

// Authorization guard for admin API route handlers. Verifies the admin
// session and (for state-changing methods) same-origin.
export async function requireAdminApi(
  req: NextRequest
): Promise<{ admin: Admin } | { response: NextResponse }> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    const csrf = assertSameOrigin(req);
    if (csrf) return { response: csrf };
  }
  const current = await getAdminSession();
  if (!current) return { response: jsonError(401, "Admin authentication required") };
  return { admin: current.admin };
}
