import type { SystemCheckItem } from "@/lib/types";

export default function CandidateWaiting({
  note,
  systemCheck,
  onEnter,
}: {
  note: string;
  systemCheck: SystemCheckItem[];
  onEnter: () => void;
}) {
  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "70px 28px" }}>
      <div className="eyebrow">Waiting room</div>
      <div className="mono" style={{ fontSize: 56, lineHeight: 1, marginTop: 14 }}>04:12</div>
      <div style={{ fontSize: 14, marginTop: 10, color: "color-mix(in srgb, var(--color-text) 70%, transparent)" }}>
        until 13:45. Your interviewer has not started the session yet. You can stay on this page.
      </div>
      <hr className="hr" style={{ margin: "26px 0" }} />

      <div className="eyebrow" style={{ marginBottom: 8 }}>Note from your interviewer</div>
      <div style={{ fontSize: 15, lineHeight: 1.65, maxWidth: "56ch" }}>{note}</div>

      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 8 }}>
        {systemCheck.map((c) => (
          <div key={c.label} className="mono" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, background: "var(--color-accent)" }} />
            <span style={{ width: 150 }}>{c.label}</span>
            <span style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>{c.value}</span>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 26 }} onClick={onEnter}>
        Enter the interview
      </button>
    </div>
  );
}
