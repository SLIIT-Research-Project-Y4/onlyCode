"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const role = getSession();
    router.replace(role ? `/${role}` : "/login");
  }, [router]);

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", color: "var(--color-text)" }}>
      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 20 }}>CodeTrace</span>
    </div>
  );
}
