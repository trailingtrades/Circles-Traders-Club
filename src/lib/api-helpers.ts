import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

// CSRF defence-in-depth: cookies are SameSite=Lax, and additionally every
// state-changing API call must originate from our own origin.
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Non-browser clients (no Origin header) can't carry browser cookies
    // cross-site, so nothing to defend against.
    return null;
  }
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try {
    if (new URL(origin).host !== host) {
      return jsonError(403, "Cross-origin request rejected");
    }
  } catch {
    return jsonError(403, "Invalid Origin header");
  }
  return null;
}

export async function enforceRateLimit(
  scope: string,
  limit: number,
  windowMs: number,
  extraKey = ""
): Promise<NextResponse | null> {
  const { ip } = await getRequestInfo();
  const { ok, retryAfterSeconds } = rateLimit(`${scope}:${ip}:${extraKey}`, limit, windowMs);
  if (!ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }
  return null;
}

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return jsonError(400, first ? `${first.path.join(".")}: ${first.message}` : "Invalid input");
  }
  console.error("API error:", err);
  return jsonError(500, "Internal server error");
}
