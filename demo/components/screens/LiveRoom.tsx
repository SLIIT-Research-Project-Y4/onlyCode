import CodeLines from "../CodeLines";
import { breakdownFor, cellsFor, filesFor, flagRowInfo, markersFor, signalsFor, visibleFlags } from "@/lib/derive";
import { clsColor, isShown } from "@/lib/logic";
import type { CodeLineView, EditorMode, Flag, WindowPoint } from "@/lib/types";

export default function LiveRoom({
  mirrorLines,
  onLineClick,
  elapsed,
  windows,
  threshold,
  t,
  playing,
  onTogglePlay,
  onScrub,
  flags,
  editorMode,
  falsePos,
  dismissed,
  probeSentFor,
  followupCreated,
  onOpenFlag,
}: {
  mirrorLines: CodeLineView[];
  onLineClick: (f: Flag) => void;
  elapsed: string;
  windows: WindowPoint[];
  threshold: number;
  t: number;
  playing: boolean;
  onTogglePlay: () => void;
  onScrub: (sec: number) => void;
  flags: Flag[];
  editorMode: EditorMode;
  falsePos: Record<number, string>;
  dismissed: Record<number, true>;
  probeSentFor: number | null;
  followupCreated: boolean;
  onOpenFlag: (f: Flag) => void;
}) {
  const nowIdx = Math.min(89, Math.floor(t / 30));
  const flagsAll = flags.filter((f) => isShown(f, threshold));
  const concerns = flagsAll.filter((f) => !(f.cls === "ide_ai" && editorMode === "allowed"));
  const visible = visibleFlags(flagsAll, t);
  const cells = cellsFor(windows, nowIdx, onScrub);
  const files = filesFor(followupCreated);
  const markers = markersFor(flagsAll, t, (sec, flagId) => {
    onScrub(sec);
    const f = flagsAll.find((x) => x.id === flagId);
    if (f) onOpenFlag(f);
  });
  const breakdown = breakdownFor();
  const signals = signalsFor(nowIdx, t, flagsAll);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(430px,0.75fr)", gridTemplateRows: "minmax(0,1fr)", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, borderRight: "2px solid var(--color-divider)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 18px", borderBottom: "1px solid var(--color-divider)", flex: "none" }}>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Candidate code · mirrored
          </span>
          <span className="flag-tag" style={{ background: "var(--color-neutral-200)", color: "var(--color-neutral-800)" }}>read-only</span>
          <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            solution.py · Python 3.11 · autocomplete allowed
          </span>
        </div>
        <div className="code-pane" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "14px 0 40px" }}>
          <CodeLines lines={mirrorLines} onLineClick={onLineClick} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--color-divider)", flex: "none" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-accent)", animation: "pulse-dot 2s infinite" }} />
          <span className="mono" style={{ fontSize: 11 }}>connected · 41 ms</span>
          <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            candidate C-4471
          </span>
          <span className="mono" style={{ fontSize: 11 }}>elapsed {elapsed}</span>
        </div>

        <div style={{ padding: 16, borderBottom: "2px solid var(--color-divider)" }}>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 10 }}>
            <span className="eyebrow">Files</span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
              candidate workspace
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {files.map((file) => (
              <div
                key={file.key}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  padding: "8px 12px",
                  borderLeft: `3px solid ${file.isNew ? "var(--color-accent)" : "transparent"}`,
                  background: "color-mix(in srgb, var(--color-text) 4%, transparent)",
                }}
              >
                <span className="mono" style={{ fontSize: 12.5 }}>{file.name}</span>
                {file.isNew && (
                  <span className="flag-tag" style={{ background: "var(--color-accent)", color: "#f8f4f4" }}>new</span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                  {file.detail}
                </span>
              </div>
            ))}
          </div>
          {!followupCreated && (
            <div className="mono" style={{ marginTop: 10, fontSize: 11, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
              followup1.py appears once a flag is sent to the candidate
            </div>
          )}
        </div>

        <div style={{ padding: 16, borderBottom: "2px solid var(--color-divider)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
            <span className="eyebrow">Session timeline</span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
              90 windows × 30 s
            </span>
          </div>
          <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: 46 }}>
            {cells.map((c) => (
              <div key={c.key} style={{ flex: 1, minWidth: 0, height: c.height, background: c.background, cursor: "pointer" }} title={c.title} onClick={c.onClick} />
            ))}
          </div>
          <div style={{ position: "relative", height: 16, marginTop: 4 }}>
            {markers.map((mk) => (
              <button
                key={mk.key}
                title={mk.title}
                onClick={mk.onClick}
                className="mono"
                style={{
                  position: "absolute",
                  top: 0,
                  transform: "translateX(-50%)",
                  left: `${mk.leftPct.toFixed(2)}%`,
                  fontSize: 9.5,
                  padding: "1px 4px",
                  border: 0,
                  cursor: "pointer",
                  background: mk.background,
                  color: "#f8f4f4",
                  opacity: mk.opacity,
                }}
              >
                {mk.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={onTogglePlay}>
              {playing ? "Pause" : "Play"}
            </button>
            <input type="range" min={0} max={2700} step={15} value={t} onChange={(e) => onScrub(Number(e.target.value))} style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 11, width: 44, textAlign: "right" }}>{elapsed}</span>
          </div>
        </div>

        <div style={{ padding: 16, borderBottom: "2px solid var(--color-divider)" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Class breakdown · session to date</div>
          <div style={{ display: "flex", height: 14, gap: 1 }}>
            {breakdown.map((b) => (
              <div key={b.cls} style={{ width: `${b.barWidthPct}%`, background: clsColor(b.cls) }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 10, flexWrap: "wrap" }}>
            {breakdown.map((b) => (
              <div key={b.cls} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ display: "inline-block", width: 10, height: 10, background: clsColor(b.cls) }} />
                <span className="mono" style={{ fontSize: 12 }}>{b.cls}</span>
                <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{b.pctText}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 16, borderBottom: "2px solid var(--color-divider)" }}>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 10 }}>
            <span className="eyebrow">Flags</span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 11 }}>
              {visible.length} of {flagsAll.length} so far · {concerns.length} to review
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {visible.map((f) => {
              const info = flagRowInfo(f, { editorMode, falsePos, dismissed, probeSentFor, followupCreated });
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
                  {info.outcome && (
                    <div className="mono" style={{ fontSize: 11, marginTop: 6, color: "var(--color-accent-700)" }}>{info.outcome}</div>
                  )}
                </button>
              );
            })}
          </div>
          {visible.length === 0 && (
            <div className="mono" style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 50%, transparent)", padding: "8px 0" }}>
              no flags above threshold yet
            </div>
          )}
        </div>

        <div style={{ padding: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Live signals</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--color-divider)" }}>
            {signals.map((s) => (
              <div key={s.label} style={{ background: "var(--color-bg)", padding: "9px 10px" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  {s.label}
                </div>
                <div className="mono" style={{ fontSize: 17, marginTop: 3 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
