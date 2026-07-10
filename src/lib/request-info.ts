import { headers } from "next/headers";

// Extracts client IP / user-agent and derives a coarse device + browser label
// for activity logging and session records.

export function parseUserAgent(ua: string | null): { device: string; browser: string } {
  if (!ua) return { device: "Unknown", browser: "Unknown" };

  let device = "Desktop";
  if (/iPad|Tablet/i.test(ua)) device = "Tablet";
  else if (/Mobi|iPhone|Android.*Mobile/i.test(ua)) device = "Mobile";

  if (/Windows/i.test(ua)) device += " · Windows";
  else if (/Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) device += " · macOS";
  else if (/iPhone|iPad/i.test(ua)) device += " · iOS";
  else if (/Android/i.test(ua)) device += " · Android";
  else if (/Linux/i.test(ua)) device += " · Linux";

  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  return { device, browser };
}

export async function getRequestInfo(): Promise<{
  ip: string;
  userAgent: string;
  device: string;
  browser: string;
}> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip")) || "unknown";
  const userAgent = h.get("user-agent") || "";
  const { device, browser } = parseUserAgent(userAgent);
  return { ip, userAgent, device, browser };
}
