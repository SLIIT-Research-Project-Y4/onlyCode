import type { SystemCheckItem } from "@/lib/types";

export default function CandidateJoin({
  note,
  candName,
  setCandName,
  candEmail,
  setCandEmail,
  systemCheck,
  onJoin,
}: {
  note: string;
  candName: string;
  setCandName: (v: string) => void;
  candEmail: string;
  setCandEmail: (v: string) => void;
  systemCheck: SystemCheckItem[];
  onJoin: () => void;
}) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 28px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent)" }}>
        Technical interview
      </div>
      <h2 style={{ margin: "8px 0 0" }}>Senior Backend Engineer — Round 2</h2>
      <div className="mono" style={{ fontSize: 14, marginTop: 8, color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
        15 Aug 2026 · 13:45 · 45 minutes · Python
      </div>
      <hr className="hr" style={{ margin: "28px 0" }} />

      <div className="eyebrow" style={{ marginBottom: 8 }}>Note from your interviewer</div>
      <div style={{ fontSize: 15, lineHeight: 1.65, maxWidth: "56ch" }}>{note}</div>
      <hr className="hr" style={{ margin: "28px 0" }} />

      <div className="eyebrow" style={{ marginBottom: 8 }}>What we record during this interview</div>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.75 }}>
        <li>Every key you press and every edit you make, with timing</li>
        <li>When this browser tab loses focus or is hidden</li>
        <li>Periodic snapshots of your code</li>
      </ul>
      <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 80%, transparent)" }}>
        Your typed code can be reconstructed from this recording.
      </p>
      <div style={{ border: "2px solid var(--color-text)", padding: 16, marginTop: 8 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>What we do not record</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          Your screen, your camera, your microphone, or anything outside this tab. We cannot see your other windows, and we do not try to stop you opening them.
        </div>
      </div>
      <hr className="hr" style={{ margin: "28px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 460 }}>
        <div className="field">
          <label>Name</label>
          <input className="input" value={candName} onChange={(e) => setCandName(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input className="input" value={candEmail} onChange={(e) => setCandEmail(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
        {systemCheck.map((c) => (
          <div key={c.label} className="mono" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, background: "var(--color-accent)" }} />
            <span style={{ width: 150 }}>{c.label}</span>
            <span style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>{c.value}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn btn-primary" onClick={onJoin}>Agree and Continue</button>
        <span style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          By continuing, you agree to what&apos;s recorded above.
        </span>
      </div>
    </div>
  );
}
