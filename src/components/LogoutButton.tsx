"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({
  endpoint = "/api/auth/logout",
  redirectTo = "/login",
  className = "btn-secondary",
}: {
  endpoint?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch(endpoint, { method: "POST" });
    } finally {
      router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={className}>
      {busy ? "Logging out…" : "Logout"}
    </button>
  );
}
