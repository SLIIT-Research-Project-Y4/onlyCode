import { clsColor } from "@/lib/logic";
import type { CompletedInterview, ScheduledInterview } from "@/lib/types";

export default function InterviewsList({
  scheduled,
  completed,
  onCreate,
  onOpenLive,
  onOpenLink,
  onOpenReport,
}: {
  scheduled: ScheduledInterview[];
  completed: CompletedInterview[];
  onCreate: () => void;
  onOpenLive: () => void;
  onOpenLink: () => void;
  onOpenReport: () => void;
}) {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "34px 28px 60px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>Interviews</h2>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={onCreate}>
          New interview
        </button>
      </div>
      <hr className="hr" />

      <div className="eyebrow" style={{ margin: "20px 0 6px" }}>Scheduled</div>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 150 }}>Date</th>
            <th>Role</th>
            <th style={{ width: 110 }}>Candidate</th>
            <th style={{ width: 90 }}>Duration</th>
            <th style={{ width: 280 }}>Integrity</th>
          </tr>
        </thead>
        <tbody>
          {scheduled.map((r) => (
            <tr
              key={r.ref + r.when}
              style={{
                cursor: "pointer",
                background: r.live ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : undefined,
                boxShadow: r.live ? "inset 3px 0 0 var(--color-accent)" : undefined,
              }}
              onClick={r.live ? onOpenLive : onOpenLink}
            >
              <td className="mono" style={{ fontSize: 13 }}>{r.when}</td>
              <td>{r.role}</td>
              <td className="mono" style={{ fontSize: 13 }}>{r.ref}</td>
              <td className="mono" style={{ fontSize: 13 }}>{r.dur}</td>
              <td>
                <span
                  className="flag-tag"
                  style={{
                    background: r.live ? "var(--color-accent)" : "var(--color-neutral-200)",
                    color: r.live ? "var(--color-bg)" : "var(--color-neutral-800)",
                  }}
                >
                  {r.tag}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="eyebrow" style={{ margin: "30px 0 6px" }}>Completed</div>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 150 }}>Date</th>
            <th>Role</th>
            <th style={{ width: 110 }}>Candidate</th>
            <th style={{ width: 90 }}>Duration</th>
            <th style={{ width: 280 }}>Integrity</th>
          </tr>
        </thead>
        <tbody>
          {completed.map((r) => (
            <tr key={r.ref + r.when} style={{ cursor: "pointer" }} onClick={onOpenReport}>
              <td className="mono" style={{ fontSize: 13 }}>{r.when}</td>
              <td>{r.role}</td>
              <td className="mono" style={{ fontSize: 13 }}>{r.ref}</td>
              <td className="mono" style={{ fontSize: 13 }}>{r.dur}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", height: 8, width: 150, gap: 1 }}>
                    <div style={{ width: `${r.split[0]}%`, background: clsColor("no_ai") }} />
                    <div style={{ width: `${r.split[1]}%`, background: clsColor("ide_ai") }} />
                    <div style={{ width: `${r.split[2]}%`, background: clsColor("external_ai") }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
                    {r.flags} {r.flags === 1 ? "flag" : "flags"}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
