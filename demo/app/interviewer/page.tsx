"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import AccountBadge from "@/components/AccountBadge";
import RequireRole from "@/components/RequireRole";
import FlagModal from "@/components/FlagModal";
import InterviewsList from "@/components/screens/InterviewsList";
import CreateInterview from "@/components/screens/CreateInterview";
import LinkGenerated from "@/components/screens/LinkGenerated";
import LiveRoom from "@/components/screens/LiveRoom";
import IntegrityReport from "@/components/screens/IntegrityReport";
import { CODE_SRC, DEFAULT_NOTE, DEFAULT_PROBLEM, DEFAULT_ROLE_TITLE, FLAGS, SCHEDULED, COMPLETED, buildWindows } from "@/lib/data";
import { buildCodeLines, fmt } from "@/lib/logic";
import { publishLive } from "@/lib/liveChannel";
import type { Decision, EditorMode, Flag, IScreen } from "@/lib/types";

interface State {
  iScreen: IScreen;
  t: number;
  playing: boolean;
  openFlagId: number | null;
  probeSentFor: number | null;
  dismissed: Record<number, true>;
  falsePos: Record<number, string>;
  fpOpen: boolean;
  fpReason: string;
  threshold: number;
  editorMode: EditorMode;
  dur: string;
  lang: string;
  roleTitle: string;
  date: string;
  time: string;
  problem: string;
  note: string;
  copied: boolean;
  notes: string;
  decision: Decision | null;
}

const initialState: State = {
  iScreen: "list",
  t: 1104,
  playing: false,
  openFlagId: null,
  probeSentFor: null,
  dismissed: {},
  falsePos: {},
  fpOpen: false,
  fpReason: "",
  threshold: 0.65,
  editorMode: "allowed",
  dur: "45",
  lang: "Python",
  roleTitle: DEFAULT_ROLE_TITLE,
  date: "2026-08-15",
  time: "13:45",
  problem: DEFAULT_PROBLEM,
  note: DEFAULT_NOTE,
  copied: false,
  notes: "",
  decision: null,
};

const NAV: { id: IScreen; label: string }[] = [
  { id: "list", label: "Interviews" },
  { id: "live", label: "Live room" },
];

export default function InterviewerPage() {
  return (
    <RequireRole role="interviewer">
      <InterviewerApp />
    </RequireRole>
  );
}

function InterviewerApp() {
  const [state, setState] = useState<State>(initialState);
  const windows = useMemo(() => buildWindows(), []);

  const patch = (u: Partial<State> | ((s: State) => Partial<State>)) =>
    setState((s) => ({ ...s, ...(typeof u === "function" ? u(s) : u) }));

  useEffect(() => {
    if (!state.playing) return;
    const id = setInterval(() => {
      patch((s) => {
        const nt = s.t + 15;
        if (nt >= 2700) return { t: 2700, playing: false };
        return { t: nt };
      });
    }, 120);
    return () => clearInterval(id);
  }, [state.playing]);

  const openFlag: Flag | null = state.openFlagId ? FLAGS.find((f) => f.id === state.openFlagId) ?? null : null;

  const mirrorLines = useMemo(
    () =>
      buildCodeLines(CODE_SRC, {
        flags: true,
        flagList: FLAGS,
        threshold: state.threshold,
        falsePos: state.falsePos,
        t: state.t,
        editorMode: state.editorMode,
      }),
    [state.threshold, state.falsePos, state.t, state.editorMode],
  );

  const openFlagSegment = useMemo(() => {
    if (!openFlag) return [];
    return buildCodeLines(CODE_SRC.slice(openFlag.from - 1, openFlag.to), {
      flags: true,
      offset: openFlag.from - 1,
      flagList: FLAGS,
      threshold: state.threshold,
      falsePos: state.falsePos,
      t: state.t,
      editorMode: state.editorMode,
    });
  }, [openFlag, state.threshold, state.falsePos, state.t, state.editorMode]);

  const openFlagRow = (f: Flag) => patch({ openFlagId: f.id, fpOpen: false });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)", overflow: "hidden" }}>
      <Header
        navItems={NAV}
        current={state.iScreen}
        onNav={(id) => patch({ iScreen: id as IScreen })}
        rightSlot={
          <>
            <span className="mono" style={{ fontSize: 11, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              session {fmt(state.t)} / 45:00
            </span>
            <AccountBadge role="interviewer" />
          </>
        }
      />

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {state.iScreen === "live" && (
          <LiveRoom
            mirrorLines={mirrorLines}
            onLineClick={openFlagRow}
            elapsed={fmt(state.t)}
            windows={windows}
            threshold={state.threshold}
            t={state.t}
            playing={state.playing}
            onTogglePlay={() => patch((s) => ({ playing: !s.playing }))}
            onScrub={(sec) => patch({ t: sec, playing: false })}
            flags={FLAGS}
            editorMode={state.editorMode}
            falsePos={state.falsePos}
            dismissed={state.dismissed}
            probeSentFor={state.probeSentFor}
            onOpenFlag={openFlagRow}
          />
        )}

        {state.iScreen === "list" && (
          <InterviewsList
            scheduled={SCHEDULED}
            completed={COMPLETED}
            onCreate={() => patch({ iScreen: "create" })}
            onOpenLive={() => patch({ iScreen: "live" })}
            onOpenLink={() => patch({ iScreen: "link" })}
            onOpenReport={() => patch({ iScreen: "report" })}
          />
        )}

        {state.iScreen === "create" && (
          <CreateInterview
            roleTitle={state.roleTitle}
            setRoleTitle={(v) => patch({ roleTitle: v })}
            date={state.date}
            setDate={(v) => patch({ date: v })}
            time={state.time}
            setTime={(v) => patch({ time: v })}
            dur={state.dur}
            setDur={(v) => patch({ dur: v })}
            lang={state.lang}
            setLang={(v) => patch({ lang: v })}
            problem={state.problem}
            setProblem={(v) => patch({ problem: v })}
            note={state.note}
            setNote={(v) => patch({ note: v })}
            editorMode={state.editorMode}
            setEditorMode={(v) => patch({ editorMode: v })}
            threshold={state.threshold}
            setThreshold={(v) => patch({ threshold: v })}
            onSave={() => patch({ iScreen: "link" })}
            onCancel={() => patch({ iScreen: "list" })}
          />
        )}

        {state.iScreen === "link" && (
          <LinkGenerated
            roleTitle={state.roleTitle}
            note={state.note}
            copied={state.copied}
            onCopy={() => patch({ copied: true })}
            onRegen={() => patch({ copied: false })}
            onCopyInvite={() => patch({ copied: true })}
            onOpenLive={() => patch({ iScreen: "live" })}
          />
        )}

        {state.iScreen === "report" && (
          <IntegrityReport
            roleTitle={state.roleTitle}
            threshold={state.threshold}
            windows={windows}
            flags={FLAGS}
            editorMode={state.editorMode}
            falsePos={state.falsePos}
            dismissed={state.dismissed}
            probeSentFor={state.probeSentFor}
            mirrorLines={mirrorLines}
            onLineClick={openFlagRow}
            notes={state.notes}
            setNotes={(v) => patch({ notes: v })}
            decision={state.decision}
            setDecision={(v) => patch({ decision: v })}
            onOpenFlag={openFlagRow}
          />
        )}
      </div>

      {openFlag && (
        <FlagModal
          flag={openFlag}
          segment={openFlagSegment}
          probeSentFor={state.probeSentFor}
          dismissed={state.dismissed}
          falsePos={state.falsePos}
          fpOpen={state.fpOpen}
          fpReason={state.fpReason}
          onClose={() => patch({ openFlagId: null, fpOpen: false })}
          onSendProbe={() =>
            patch((s) => {
              if (s.openFlagId) publishLive({ type: "probe-sent", flagId: s.openFlagId });
              return { probeSentFor: s.openFlagId };
            })
          }
          onEditProbe={() => patch({ fpOpen: false })}
          onDismiss={() =>
            patch((s) => ({ dismissed: { ...s.dismissed, ...(s.openFlagId ? { [s.openFlagId]: true } : {}) } }))
          }
          onMarkFP={() => patch({ fpOpen: true })}
          onSaveFP={() =>
            patch((s) => ({
              falsePos: s.openFlagId ? { ...s.falsePos, [s.openFlagId]: s.fpReason || "no reason given" } : s.falsePos,
              fpOpen: false,
            }))
          }
          onSetFpReason={(v) => patch({ fpReason: v })}
        />
      )}
    </div>
  );
}
