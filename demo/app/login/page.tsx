"use client";

import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, setSession } from "@/lib/auth";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["interviewer", "candidate"];

export default function LoginPage() {
  const router = useRouter();

  const signIn = (role: Role) => {
    setSession(role);
    router.push(`/${role}`);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", color: "var(--color-text)", padding: 24 }}>
      <div style={{ width: "min(680px, 100%)" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 28, letterSpacing: "-0.02em" }}>CodeTrace</span>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginTop: 8 }}>
            integrity for technical interviews
          </div>
        </div>

        <h2 style={{ textAlign: "center", margin: "0 0 6px" }}>Sign in</h2>
        <p className="text-muted" style={{ textAlign: "center", maxWidth: "44ch", margin: "0 auto 32px" }}>
          Demo environment — no backend, no real accounts. Pick one of the two accounts below to continue as that role.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {ROLES.map((role) => {
            const account = DEMO_ACCOUNTS[role];
            return (
              <div key={role} style={{ border: "2px solid var(--color-text)", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div className="eyebrow">{role}</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 18, marginTop: 4 }}>{account.name}</div>
                </div>
                <div className="mono" style={{ fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 65%, transparent)", display: "flex", flexDirection: "column", gap: 3 }}>
                  <span>{account.email}</span>
                  <span>••••••••</span>
                </div>
                <button className="btn btn-primary" style={{ marginTop: "auto" }} onClick={() => signIn(role)}>
                  Sign in as {role}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
