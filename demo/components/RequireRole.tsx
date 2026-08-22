"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Role } from "@/lib/types";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getServerSnapshot() {
  return null;
}

export default function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const session = useSyncExternalStore(subscribe, getSession, getServerSnapshot);

  useEffect(() => {
    if (session !== role) router.replace(session ? `/${session}` : "/login");
  }, [session, role, router]);

  if (session !== role) return null;
  return <>{children}</>;
}
