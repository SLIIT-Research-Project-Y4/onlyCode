import { DURATIONS, LANGUAGES } from "@/lib/data";

export default function CreateInterview({
  roleTitle,
  setRoleTitle,
  candidateEmail,
  setCandidateEmail,
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
  onSave,
  onSendEmail,
  onCancel,
}: {
  roleTitle: string;
  setRoleTitle: (v: string) => void;
  candidateEmail: string;
  setCandidateEmail: (v: string) => void;
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
  onSave: () => void;
  onSendEmail: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "34px 28px 60px" }}>
      <h2 style={{ margin: 0 }}>New interview</h2>
      <p className="text-muted" style={{ maxWidth: "52ch" }}>
        Scheduling details and what the candidate will see during the interview.
      </p>
      <hr className="hr" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px" }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Role / title</label>
          <input className="input" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Candidate email</label>
          <input
            className="input"
            type="email"
            placeholder="candidate@example.com"
            value={candidateEmail}
            onChange={(e) => setCandidateEmail(e.target.value)}
          />
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
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" onClick={onSave}>Save and generate link</button>
        <button className="btn btn-secondary" onClick={onSendEmail}>Send link to email</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
