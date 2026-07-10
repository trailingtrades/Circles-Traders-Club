"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Client-side auto-logout after inactivity (server enforces its own idle
// timeout independently — this just gives the user a clean exit).
export default function IdleLogout({
  minutes = 30,
  endpoint = "/api/auth/logout",
  redirectTo = "/login?timeout=1",
}: {
  minutes?: number;
  endpoint?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        try {
          await fetch(endpoint, { method: "POST" });
        } finally {
          router.push(redirectTo);
        }
      }, minutes * 60_000);
    };
    const events = ["mousemove", "keydown", "scroll", "touchstart", "click"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes, endpoint, redirectTo, router]);

  return null;
}
