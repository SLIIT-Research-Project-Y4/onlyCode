"use client";

import { useRouter } from "next/navigation";
import { clearSession, DEMO_ACCOUNTS } from "@/lib/auth";
import type { Role } from "@/lib/types";

export default function AccountBadge({ role }: { role: Role }) {
  const router = useRouter();
  const account = DEMO_ACCOUNTS[role];

  return (
    <>
      <span className="mono" style={{ fontSize: 11, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
        {account.name} · {role}
      </span>
      <button
        className="btn btn-secondary"
        style={{ padding: "4px 12px", fontSize: 12 }}
        onClick={() => {
          clearSession();
          router.push("/login");
        }}
      >
        Log out
      </button>
    </>
  );
}
