export default function LinkGenerated({
  roleTitle,
  note,
  copied,
  candidateEmail,
  emailSent,
  onCopy,
  onRegen,
  onCopyInvite,
  onOpenLive,
}: {
  roleTitle: string;
  note: string;
  copied: boolean;
  candidateEmail: string;
  emailSent: boolean;
  onCopy: () => void;
  onRegen: () => void;
  onCopyInvite: () => void;
  onOpenLive: () => void;
}) {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "34px 28px 60px" }}>
      <h2 style={{ margin: 0 }}>Interview scheduled</h2>
      <p className="text-muted">Send this link to the candidate. It opens the join screen below.</p>
      <hr className="hr" />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 32 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Join link</div>
          <div style={{ display: "flex", alignItems: "stretch", gap: 0, border: "2px solid var(--color-text)" }}>
            <div className="mono" style={{ flex: 1, padding: "14px 16px", fontSize: 19, overflow: "auto", whiteSpace: "nowrap" }}>
              integrai.app/join/8F2K-QM4X-7RTP
            </div>
            <button className="btn btn-primary" style={{ borderRadius: 0, paddingInline: 20 }} onClick={onCopy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--color-divider)", marginTop: 20 }}>
            <div style={{ background: "var(--color-bg)", padding: "12px 14px" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Scheduled
              </div>
              <div className="mono" style={{ fontSize: 15, marginTop: 4 }}>15 Aug 2026 · 13:45</div>
            </div>
            <div style={{ background: "var(--color-bg)", padding: "12px 14px" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Link expires
              </div>
              <div className="mono" style={{ fontSize: 15, marginTop: 4 }}>15 Aug 2026 · 14:30</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={onRegen}>Regenerate link</button>
            <button className="btn btn-secondary" onClick={onCopyInvite}>Copy email invite</button>
            <button className="btn btn-ghost" onClick={onOpenLive}>Open live room</button>
          </div>
          {emailSent && (
            <div className="mono" style={{ fontSize: 12, marginTop: 14, color: "var(--color-accent-700)" }}>
              ✓ Link sent to {candidateEmail || "the candidate"}
            </div>
          )}
        </div>
        <div style={{ border: "1px solid var(--color-divider)", background: "var(--color-surface)", padding: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 10 }}>
            What the candidate sees
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>{roleTitle}</div>
          <div className="mono" style={{ fontSize: 12, marginTop: 6, color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
            15 Aug 2026 · 13:45 · 45 min · Python
          </div>
          <hr className="hr" style={{ margin: "14px 0" }} />
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>{note}</div>
        </div>
      </div>
    </div>
  );
}
