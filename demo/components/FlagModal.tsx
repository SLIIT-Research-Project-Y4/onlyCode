import CodeLines from "./CodeLines";
import { clsInk, clsTagBg } from "@/lib/logic";
import type { CodeLineView, Flag } from "@/lib/types";

const MAX_ABS = 0.35;

function priorityStyle(priority: Flag["priority"]): React.CSSProperties {
  const bg =
    priority === "high priority"
      ? "var(--color-accent)"
      : priority === "medium priority"
        ? "var(--color-accent-300)"
        : "var(--color-neutral-200)";
  return {
    background: bg,
    color: priority === "high priority" ? "var(--color-bg)" : "var(--color-neutral-900)",
  };
}

export default function FlagModal({
  flag,
  segment,
  probeSentFor,
  dismissed,
  falsePos,
  fpOpen,
  fpReason,
  onClose,
  onSendProbe,
  onEditProbe,
  onDismiss,
  onMarkFP,
  onSaveFP,
  onSetFpReason,
}: {
  flag: Flag;
  segment: CodeLineView[];
  probeSentFor: number | null;
  dismissed: Record<number, true>;
  falsePos: Record<number, string>;
  fpOpen: boolean;
  fpReason: string;
  onClose: () => void;
  onSendProbe: () => void;
  onEditProbe: () => void;
  onDismiss: () => void;
  onMarkFP: () => void;
  onSaveFP: () => void;
  onSetFpReason: (v: string) => void;
}) {
  let loopState = "";
  if (probeSentFor === flag.id) loopState = "probe 1 sent · awaiting response · re-check pending";
  else if (dismissed[flag.id]) loopState = "flag dismissed · kept in the report for the record";
  else if (falsePos[flag.id]) loopState = "marked false positive · " + falsePos[flag.id];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--color-neutral-900) 55%, transparent)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "34px 24px",
        overflow: "auto",
        zIndex: 20,
      }}
    >
      <div style={{ width: "min(1080px,100%)", background: "var(--color-bg)", border: "2px solid var(--color-text)", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: "2px solid var(--color-divider)" }}>
          <span className="flag-tag" style={{ fontSize: 14, padding: "4px 10px", background: clsTagBg(flag.cls), color: clsInk(flag.cls) }}>
            {flag.cls}
          </span>
          <span className="mono" style={{ fontSize: 15 }}>
            lines {flag.from}–{flag.to} · confidence {flag.conf.toFixed(2)} · at {flag.at}
          </span>
          <button className="btn btn-secondary" style={{ marginLeft: "auto", padding: "4px 12px", fontSize: 12 }} onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
          <div style={{ borderRight: "2px solid var(--color-divider)" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--color-divider)" }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>A · The evidence</div>
              <div className="code-pane" style={{ maxHeight: 190, overflow: "auto", padding: "10px 0" }}>
                <CodeLines lines={segment} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 14 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 6 }}>
                    Before this segment
                  </div>
                  {flag.before.map((e, i) => (
                    <div key={i} className="mono" style={{ fontSize: 12, lineHeight: 1.7 }}>
                      {e}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 6 }}>
                    Then
                  </div>
                  {flag.then.map((e, i) => (
                    <div key={i} className="mono" style={{ fontSize: 12, lineHeight: 1.7 }}>
                      {e}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>B · Why the score is what it is</div>
              <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "color-mix(in srgb, var(--color-text) 45%, transparent)", marginBottom: 8 }}>
                <span>pushed away from AI</span>
                <span>pushed toward AI</span>
              </div>
              {flag.contributions.map((c, i) => {
                const wpct = Math.min(50, (Math.abs(c.val) / MAX_ABS) * 50);
                const pos = c.val >= 0;
                const valText = (c.base ? "" : pos ? "+" : "−") + Math.abs(c.val).toFixed(2);
                const barColor = c.base ? "var(--color-neutral-500)" : pos ? "var(--color-accent)" : "var(--color-neutral-700)";
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 150px 58px", gap: 10, alignItems: "center", padding: "3px 0" }}>
                    <div style={{ fontSize: 12.5 }}>{c.label}</div>
                    <div style={{ position: "relative", height: 12, background: "color-mix(in srgb, var(--color-text) 7%, transparent)" }}>
                      <span style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "color-mix(in srgb, var(--color-text) 40%, transparent)" }} />
                      <span
                        style={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: pos ? "50%" : undefined,
                          right: !pos ? "50%" : undefined,
                          width: `${wpct}%`,
                          background: barColor,
                        }}
                      />
                    </div>
                    <div className="mono" style={{ fontSize: 12.5, textAlign: "right" }}>
                      {valText}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 150px 58px", gap: 10, borderTop: "2px solid var(--color-divider)", marginTop: 8, paddingTop: 8 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 13 }}>Final confidence</div>
                <div />
                <div className="mono" style={{ fontSize: 15, textAlign: "right", fontWeight: 600 }}>
                  {flag.conf.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--color-divider)" }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>C · What would have changed it</div>
              {flag.counterfactuals.map((cf, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "7px 0", borderBottom: "1px solid var(--color-divider)" }}>
                  <span style={{ fontSize: 13 }}>{cf.label}</span>
                  <span className="mono" style={{ marginLeft: "auto", fontSize: 15 }}>
                    {cf.score}
                  </span>
                </div>
              ))}
              <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 10, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                These cover only things a candidate could actually control. Typing rhythm and burst length are locked and never suggested.
              </div>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>D · Verify it</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--color-divider)", marginBottom: 14 }}>
                {flag.segmentStats.map((s, i) => (
                  <div key={i} style={{ background: "var(--color-bg)", padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                      {s.label}
                    </div>
                    <div className="mono" style={{ fontSize: 14, marginTop: 2 }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span className="flag-tag" style={priorityStyle(flag.priority)}>{flag.priority}</span>
                <span className="mono" style={{ fontSize: 12 }}>{flag.knowledge}</span>
              </div>
              <div style={{ border: "1px solid var(--color-divider)", background: "var(--color-surface)", padding: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 6 }}>
                  Proposed question
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{flag.probe}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={onSendProbe}>Send to candidate</button>
                <button className="btn btn-secondary" onClick={onEditProbe}>Edit first</button>
                <button className="btn btn-secondary" onClick={onDismiss}>Dismiss flag</button>
                <button className="btn btn-ghost" onClick={onMarkFP}>Mark as false positive</button>
              </div>
              {loopState && (
                <div className="mono" style={{ fontSize: 12, marginTop: 12, padding: "8px 10px", borderLeft: "2px solid var(--color-accent)", background: "var(--color-accent-100)", color: "var(--color-accent-800)" }}>
                  {loopState}
                </div>
              )}
              {fpOpen && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, marginBottom: 6, color: "color-mix(in srgb, var(--color-text) 70%, transparent)" }}>
                    Why is this wrong? The reason is stored with the flag.
                  </div>
                  <textarea
                    className="input"
                    style={{ minHeight: 64 }}
                    placeholder="e.g. candidate reused code from their own earlier project, discussed on the call"
                    value={fpReason}
                    onChange={(e) => onSetFpReason(e.target.value)}
                  />
                  <button className="btn btn-primary" style={{ marginTop: 8, padding: "4px 12px", fontSize: 12 }} onClick={onSaveFP}>
                    Save as false positive
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
