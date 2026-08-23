import CodeEditor from "../CodeEditor";
import { FOLLOWUP_FILE_NAME } from "@/lib/data";
import type { CodeTab } from "@/lib/types";

export default function CandidateCoding({
  problem,
  note,
  probeSent,
  probeQuestion,
  onOpenFollow,
  tab,
  onTabPick,
  remaining,
  savedAgo,
  solutionCode,
  onSolutionChange,
  followupCode,
  onFollowupChange,
  output,
  onRun,
  onSubmitSolution,
  onSubmitFollowup,
}: {
  problem: string;
  note: string;
  probeSent: boolean;
  probeQuestion: string;
  onOpenFollow: () => void;
  tab: CodeTab;
  onTabPick: (v: CodeTab) => void;
  remaining: string;
  savedAgo: string;
  solutionCode: string;
  onSolutionChange: (v: string) => void;
  followupCode: string;
  onFollowupChange: (v: string) => void;
  output: string;
  onRun: () => void;
  onSubmitSolution: () => void;
  onSubmitFollowup: () => void;
}) {
  const tabs: { value: CodeTab; label: string }[] = probeSent
    ? [{ value: "solution", label: "solution.py" }, { value: "followup", label: FOLLOWUP_FILE_NAME }]
    : [{ value: "solution", label: "solution.py" }];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0,1fr)", gridTemplateRows: "minmax(0,1fr)", height: "100%", minHeight: 0 }}>
      <div style={{ borderRight: "1px solid var(--color-divider)", padding: "22px 20px", overflow: "auto" }}>
        <div className="eyebrow">Problem</div>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 19, lineHeight: 1.2, marginTop: 8 }}>
          Shortest path in a weighted graph
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 12, color: "color-mix(in srgb, var(--color-text) 80%, transparent)" }}>
          {problem}
        </div>
        <hr className="hr" style={{ margin: "22px 0" }} />
        <div style={{ borderLeft: "2px solid var(--color-accent)", paddingLeft: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 6 }}>
            Note from your interviewer
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{note}</div>
        </div>
        {probeSent && (
          <div style={{ marginTop: 22, border: "2px solid var(--color-text)", padding: 14 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 15 }}>
              The interviewer has added a follow-up question
            </div>
            <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>{probeQuestion}</div>
            {tab !== "followup" && (
              <button className="btn btn-primary" style={{ marginTop: 12, padding: "5px 12px", fontSize: 12 }} onClick={onOpenFollow}>
                Open follow-up · 12:00
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "9px 16px", borderBottom: "1px solid var(--color-divider)", flex: "none" }}>
          <div className="seg" style={{ display: "flex", gap: 1 }}>
            {tabs.map((tb) => (
              <button key={tb.value} className={`seg-opt${tab === tb.value ? " is-active" : ""}`} onClick={() => onTabPick(tb.value)}>
                {tb.label}
              </button>
            ))}
          </div>
          <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
            Python 3.11 · saved {savedAgo}
          </span>
          <span className="mono" style={{ fontSize: 15 }}>{remaining} left</span>
        </div>

        <div className="code-pane" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {tab === "solution" ? (
            <CodeEditor value={solutionCode} onChange={onSolutionChange} />
          ) : (
            <CodeEditor value={followupCode} onChange={onFollowupChange} />
          )}
        </div>

        <div style={{ flex: "none", borderTop: "1px solid var(--color-divider)", background: "#201e1d" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: "1px solid color-mix(in srgb, #f3f2f2 16%, transparent)" }}>
            {tab === "solution" ? (
              <>
                <button
                  className="btn btn-secondary"
                  style={{ color: "var(--color-neutral-200)", borderColor: "color-mix(in srgb, #f3f2f2 30%, transparent)", padding: "4px 12px", fontSize: 12 }}
                  onClick={onRun}
                >
                  Run
                </button>
                <span className="mono" style={{ fontSize: 11, color: "var(--color-neutral-500)" }}>python solution.py</span>
                <button className="btn btn-primary" style={{ marginLeft: "auto", padding: "4px 14px", fontSize: 12 }} onClick={onSubmitSolution}>
                  Submit solution
                </button>
              </>
            ) : (
              <>
                <span className="mono" style={{ fontSize: 11, color: "var(--color-neutral-500)" }}>python {FOLLOWUP_FILE_NAME}</span>
                <button className="btn btn-primary" style={{ marginLeft: "auto", padding: "4px 14px", fontSize: 12 }} onClick={onSubmitFollowup}>
                  Submit follow-up
                </button>
              </>
            )}
          </div>
          <pre className="mono" style={{ margin: 0, padding: "10px 16px 14px", height: 96, overflow: "auto", fontSize: 12, color: "var(--color-neutral-300)", lineHeight: 1.6 }}>
            {output}
          </pre>
        </div>
      </div>
    </div>
  );
}
