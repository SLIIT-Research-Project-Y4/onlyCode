"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import AccountBadge from "@/components/AccountBadge";
import RequireRole from "@/components/RequireRole";
import CandidateJoin from "@/components/screens/CandidateJoin";
import CandidateWaiting from "@/components/screens/CandidateWaiting";
import CandidateCoding from "@/components/screens/CandidateCoding";
import { CODE_SRC, DEFAULT_NOTE, DEFAULT_PROBLEM, FLAGS, FOLLOW_SRC, SYSTEM_CHECK } from "@/lib/data";
import { fmt } from "@/lib/logic";
import { subscribeLive } from "@/lib/liveChannel";
import type { CScreen, CodeTab } from "@/lib/types";

interface State {
  cScreen: CScreen;
  candName: string;
  candEmail: string;
  elapsedSec: number;
  tab: CodeTab;
  probeSentFor: number | null;
  followupQuestion: string | null;
  solutionCode: string;
  followupCode: string;
  output: string;
}

const initialState: State = {
  cScreen: "join",
  candName: "",
  candEmail: "",
  elapsedSec: 0,
  tab: "solution",
  probeSentFor: null,
  followupQuestion: null,
  solutionCode: CODE_SRC.join("\n"),
  followupCode: FOLLOW_SRC.join("\n"),
  output: "",
};

export default function CandidatePage() {
  return (
    <RequireRole role="candidate">
      <CandidateApp />
    </RequireRole>
  );
}

function CandidateApp() {
  const [state, setState] = useState<State>(initialState);
  const patch = (u: Partial<State> | ((s: State) => Partial<State>)) =>
    setState((s) => ({ ...s, ...(typeof u === "function" ? u(s) : u) }));

  // Real interview clock, ticking only once the candidate is in the room —
  // independent of the interviewer's own (scrubbable) playback timeline.
  useEffect(() => {
    if (state.cScreen !== "code") return;
    const id = setInterval(() => {
      patch((s) => (s.elapsedSec >= 2700 ? {} : { elapsedSec: s.elapsedSec + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [state.cScreen]);

  // Stands in for the backend: hearing the interviewer send a follow-up from
  // another tab of this same demo.
  useEffect(() => subscribeLive((msg) => {
    if (msg.type === "probe-sent") patch({ probeSentFor: msg.flagId });
    if (msg.type === "followup-created") patch({ followupQuestion: msg.question, solutionCode: "" });
  }), []);

  const probeSent = !!state.followupQuestion || !!state.probeSentFor;
  const probeQuestion = state.followupQuestion
    ? state.followupQuestion
    : state.probeSentFor
      ? FLAGS.find((f) => f.id === state.probeSentFor)?.probe ?? ""
      : "";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)", overflow: "hidden" }}>
      <Header rightSlot={<AccountBadge role="candidate" />} />

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {state.cScreen === "join" && (
          <CandidateJoin
            note={DEFAULT_NOTE}
            candName={state.candName}
            setCandName={(v) => patch({ candName: v })}
            candEmail={state.candEmail}
            setCandEmail={(v) => patch({ candEmail: v })}
            systemCheck={SYSTEM_CHECK}
            onJoin={() => patch({ cScreen: "wait" })}
          />
        )}

        {state.cScreen === "wait" && (
          <CandidateWaiting note={DEFAULT_NOTE} systemCheck={SYSTEM_CHECK} onEnter={() => patch({ cScreen: "code" })} />
        )}

        {state.cScreen === "code" && (
          <CandidateCoding
            problem={DEFAULT_PROBLEM}
            note={DEFAULT_NOTE}
            probeSent={probeSent}
            probeQuestion={probeQuestion}
            onOpenFollow={() => patch({ tab: "followup" })}
            tab={state.tab}
            onTabPick={(v) => patch({ tab: v })}
            remaining={fmt(2700 - state.elapsedSec)}
            savedAgo="2 s ago"
            solutionCode={state.solutionCode}
            onSolutionChange={(v) => patch({ solutionCode: v })}
            followupCode={state.followupCode}
            onFollowupChange={(v) => patch({ followupCode: v })}
            output={state.output}
            onRun={() => patch({ output: "$ python solution.py\n2.0 6.0 ['a', 'b', 'c']\nprocess finished in 0.04s" })}
            onSubmitSolution={() => patch((s) => ({ output: `$ submitted\nSolution sent to your interviewer at ${fmt(s.elapsedSec)}.` }))}
            onSubmitFollowup={() => patch((s) => ({ output: `$ submitted\nFollow-up answer sent to your interviewer at ${fmt(s.elapsedSec)}.` }))}
          />
        )}
      </div>
    </div>
  );
}
