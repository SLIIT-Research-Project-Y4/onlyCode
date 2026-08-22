import { DURATIONS, EDITOR_MODES, LANGUAGES } from "@/lib/data";
import type { EditorMode } from "@/lib/types";

export default function CreateInterview({
  roleTitle,
  setRoleTitle,
  date,
  setDate,
  time,
  setTime,
  dur,
  setDur,
  lang,
  setLang,
  problem,
  setProblem,
  note,
  setNote,
  editorMode,
  setEditorMode,
  threshold,
  setThreshold,
  onSave,
  onCancel,
}: {
  roleTitle: string;
  setRoleTitle: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  dur: string;
  setDur: (v: string) => void;
  lang: string;
  setLang: (v: string) => void;
  problem: string;
  setProblem: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  editorMode: EditorMode;
  setEditorMode: (v: EditorMode) => void;
  threshold: number;
  setThreshold: (v: number) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "34px 28px 60px" }}>
      <h2 style={{ margin: 0 }}>New interview</h2>
      <p className="text-muted" style={{ maxWidth: "52ch" }}>
        The editor mode and the flag threshold decide what the model treats as suspicious. Everything else is scheduling.
      </p>
      <hr className="hr" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px" }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Role / title</label>
          <input className="input" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Start time</label>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="field">
          <label>Duration</label>
          <div className="seg">
            {DURATIONS.map((d) => (
              <button key={d} className={`seg-opt${dur === d ? " is-active" : ""}`} onClick={() => setDur(d)}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Language</label>
          <div className="seg">
            {LANGUAGES.map((l) => (
              <button key={l} className={`seg-opt${lang === l ? " is-active" : ""}`} onClick={() => setLang(l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Problem</label>
          <textarea
            className="input mono"
            style={{ minHeight: 96, fontSize: 13 }}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
          />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Note to candidate — shown before and during the interview</label>
          <textarea className="input" style={{ minHeight: 104 }} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <hr className="hr" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 70%, transparent)", marginBottom: 8 }}>
            Editor mode
          </div>
          {EDITOR_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setEditorMode(m.value)}
              style={{
                textAlign: "left",
                display: "block",
                width: "100%",
                marginBottom: 8,
                padding: "12px 14px",
                border: "1px solid var(--color-divider)",
                cursor: "pointer",
                background: editorMode === m.value ? "var(--color-text)" : "transparent",
                color: editorMode === m.value ? "var(--color-bg)" : "var(--color-text)",
              }}
            >
              <div className="mono" style={{ fontSize: 13 }}>{m.label}</div>
              <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4, opacity: 0.8 }}>{m.help}</div>
            </button>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 70%, transparent)", marginBottom: 8 }}>
            Flag threshold
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <input
              type="range"
              min={0.4}
              max={0.9}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span className="mono" style={{ fontSize: 22 }}>{threshold.toFixed(2)}</span>
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: "color-mix(in srgb, var(--color-text) 65%, transparent)", lineHeight: 1.45 }}>
            Higher means fewer flags to review, but borderline moments may be missed. Nothing is ever auto-rejected — flags are evidence for you to read.
          </div>
        </div>
      </div>

      <hr className="hr" />
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" onClick={onSave}>Save and generate link</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
