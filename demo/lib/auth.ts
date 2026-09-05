import type { Role } from "./types";

const SESSION_KEY = "codetrace-demo-session";

export const DEMO_ACCOUNTS: Record<Role, { name: string; email: string; password: string }> = {
  interviewer: { name: "Priya Nakamura", email: "interviewer@codetrace.dev", password: "demo1234" },
  candidate: { name: "Alex Rivera", email: "candidate@codetrace.dev", password: "demo1234" },
};

// sessionStorage, not localStorage: interviewer and candidate are meant to be
// demoed side by side in two tabs of the same browser, so login must be
// per-tab — a shared key would log one role out the moment the other signs in.
export function getSession(): Role | null {
  if (typeof window === "undefined") return null;
  const v = window.sessionStorage.getItem(SESSION_KEY);
  return v === "interviewer" || v === "candidate" ? v : null;
}

export function setSession(role: Role) {
  window.sessionStorage.setItem(SESSION_KEY, role);
}

export function clearSession() {
  window.sessionStorage.removeItem(SESSION_KEY);
}
