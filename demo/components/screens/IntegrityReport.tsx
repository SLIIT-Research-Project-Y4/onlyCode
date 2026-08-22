import CodeLines from "../CodeLines";
import { cellsFor, flagRowInfo } from "@/lib/derive";
import { clsColor, isShown } from "@/lib/logic";
import type { CodeLineView, Decision, EditorMode, Flag, WindowPoint } from "@/lib/types";
import { DECISIONS } from "@/lib/data";

export default function IntegrityReport({
  roleTitle,
  threshold,
  windows,
  flags,
  editorMode,
  falsePos,
  dismissed,
  probeSentFor,
  mirrorLines,
  onLineClick,
  notes,
  setNotes,
  decision,
  setDecision,
  onOpenFlag,
}: {
  roleTitle: string;
  threshold: number;
  windows: WindowPoint[];
  flags: Flag[];
  editorMode: EditorMode;
  falsePos: Record<number, string>;
  dismissed: Record<number, true>;
  probeSentFor: number | null;
  mirrorLines: CodeLineView[];
  onLineClick: (f: Flag) => void;
  notes: string;
  setNotes: (v: string) => void;
  decision: Decision | null;
  setDecision: (v: Decision) => void;
  onOpenFlag: (f: Flag) => void;
}) {
  const flagsAll = flags.filter((f) => isShown(f, threshold));
  const concerns = flagsAll.filter((f) => !(f.cls === "ide_ai" && editorMode === "allowed"));
  const reportCells = cellsFor(windows, threshold, 89);
  const stats = [
    { label: "Overall split", value: "70 / 8 / 22" },
    { label: "Flags", value: `${flagsAll.length} (${concerns.length} to review)` },
    { label: "Probes sent", value: probeSentFor ? "1" : "0" },
    { label: "Events captured", value: "10,231" },
  ];
  const decisionText = decision ? `recorded by interviewer · ${decision.toLowerCase()}` : "";

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "34px 28px 70px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent)" }}>
            Integrity report
          </div>
          <h2 style={{ margin: "4px 0 0" }}>{roleTitle}</h2>
          <div className="mono" style={{ fontSize: 13, marginTop: 6, color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
            15 Aug 2026 · 45:00 · candidate C-4471 · Python · autocomplete allowed · threshold {threshold.toFixed(2)}
          </div>
        </div>
        <button className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={() => window.print()}>
          Export PDF
        </button>
      </div>
      <hr className="hr" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "var(--color-divider)" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--color-bg)", padding: "12px 14px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              {s.label}
            </div>
            <div className="mono" style={{ fontSize: 20, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="eyebrow" style={{ marginTop: 26, marginBottom: 8 }}>Full timeline</div>
      <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: 40 }}>
        {reportCells.map((c) => (
          <div key={c.key} style={{ flex: 1, minWidth: 0, height: c.height, background: c.background }} title={c.title} />
        ))}
      </div>

      <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 26 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Submitted code · flags marked</div>
          <div className="code-pane" style={{ height: 520, overflow: "auto", padding: "12px 0", border: "1px solid var(--color-divider)" }}>
            <CodeLines lines={mirrorLines} onLineClick={onLineClick} />
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Flags and outcomes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {flagsAll.map((f) => {
              const info = flagRowInfo(f, { editorMode, falsePos, dismissed, probeSentFor });
              return (
                <button
                  key={f.id}
                  onClick={() => onOpenFlag(f)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: "10px 12px",
                    border: 0,
                    borderLeft: `3px solid ${clsColor(f.cls)}`,
                    background: "color-mix(in srgb, var(--color-text) 4%, transparent)",
                  }}
                >
                  <div className="mono" style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 12 }}>
                    <span className="flag-tag" style={{ background: info.clsBg, color: info.clsInk }}>{f.cls}</span>
                    <span>lines {f.from}–{f.to}</span>
                    <span style={{ fontWeight: 600 }}>{f.conf.toFixed(2)}</span>
                    <span style={{ marginLeft: "auto", color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>{f.at}</span>
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 5, color: "color-mix(in srgb, var(--color-text) 72%, transparent)", lineHeight: 1.4 }}>
                    {f.reason}
                  </div>
                  <div className="mono" style={{ fontSize: 11, marginTop: 6, color: "var(--color-accent-700)" }}>
                    {info.outcome || "no action taken"}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 22, border: "2px solid var(--color-text)", padding: 16 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 17 }}>The hiring decision is yours</div>
            <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5, color: "color-mix(in srgb, var(--color-text) 72%, transparent)" }}>
              IntegrAI does not pass or fail anyone. It records behaviour and shows evidence. Record your decision below.
            </div>
            <textarea
              className="input"
              style={{ marginTop: 12, minHeight: 80 }}
              placeholder="Notes for the hiring file"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="seg" style={{ display: "flex", gap: 0, marginTop: 12 }}>
              {DECISIONS.map((d) => (
                <button key={d} className={`seg-opt${decision === d ? " is-active" : ""}`} onClick={() => setDecision(d)}>
                  {d}
                </button>
              ))}
            </div>
            {decisionText && (
              <div className="mono" style={{ fontSize: 11, marginTop: 10, color: "var(--color-accent-700)" }}>{decisionText}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
