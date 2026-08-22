export default function CandidateConsent({ onAgree, onDecline }: { onAgree: () => void; onDecline: () => void }) {
  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "60px 28px" }}>
      <h3 style={{ margin: 0 }}>What we record during this interview</h3>
      <hr className="hr" style={{ margin: "22px 0" }} />
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.75 }}>
        <li>Every key you press and every edit you make, with timing</li>
        <li>When this browser tab loses focus or is hidden</li>
        <li>Periodic snapshots of your code</li>
      </ul>
      <p style={{ marginTop: 20, fontSize: 15, lineHeight: 1.65 }}>Your typed code can be reconstructed from this recording.</p>
      <div style={{ border: "2px solid var(--color-text)", padding: 16, marginTop: 22 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16, marginBottom: 6 }}>What we do not record</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>
          Your screen, your camera, your microphone, or anything outside this tab. We cannot see your other windows, and we do not try to stop you opening them.
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
        <button className="btn btn-primary" onClick={onAgree}>I agree, continue</button>
        <button className="btn btn-secondary" onClick={onDecline}>Decline</button>
      </div>
    </div>
  );
}
