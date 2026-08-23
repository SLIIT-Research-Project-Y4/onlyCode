import { clsColor, clsInk, clsTagBg, fmt, isPermitted, isShown } from "./logic";
import { FOLLOWUP_FILE_NAME } from "./data";
import type { EditorMode, Flag, FlagClass, WindowPoint } from "./types";

export interface CellVM {
  key: number;
  height: number;
  background: string;
  title: string;
  onClick?: () => void;
}

export function cellsFor(windows: WindowPoint[], nowIdx: number, onScrubTo?: (sec: number) => void): CellVM[] {
  return windows.map((w) => {
    const past = w.i <= nowIdx;
    const h = 12 + Math.round(w.typingFreq * 60);
    const bg = !past
      ? "color-mix(in srgb, var(--color-text) 7%, transparent)"
      : w.burst
        ? clsColor(w.cls)
        : `color-mix(in srgb, var(--color-text) ${Math.round(14 + w.typingFreq * 70)}%, transparent)`;
    return {
      key: w.i,
      height: past ? h : 12,
      background: bg,
      title: `${fmt(w.i * 30)} · ${w.burst ? "sudden code burst" : w.typingFreq < 0.15 ? "little to no typing" : "typing"}`,
      onClick: onScrubTo ? () => onScrubTo(w.i * 30) : undefined,
    };
  });
}

export interface ActivityLogVM {
  key: number;
  when: string;
  description: string;
  burst: boolean;
  cls: FlagClass;
  flag: Flag | null;
}

export function activityLogFor(windows: WindowPoint[], flags: Flag[], nowIdx: number, count: number): ActivityLogVM[] {
  const start = Math.max(0, nowIdx - count + 1);
  return windows
    .slice(start, nowIdx + 1)
    .map((w) => {
      const flag = flags.find((f) => Math.floor(f.atSec / 30) === w.i) ?? null;
      let description: string;
      if (w.burst) description = flag ? flag.reason : "Sudden code burst detected";
      else if (w.typingFreq < 0.15) description = "Long pause — little to no typing";
      else if (w.typingFreq < 0.4) description = "Light, intermittent typing";
      else description = "Steady typing at a normal pace";
      return { key: w.i, when: fmt(w.i * 30), description, burst: w.burst, cls: w.cls, flag };
    })
    .reverse();
}

export interface MarkerVM {
  key: number;
  leftPct: number;
  label: string;
  title: string;
  background: string;
  opacity: number;
  onClick: () => void;
}

export function markersFor(flagsAll: Flag[], t: number, onJump: (sec: number, flagId: number) => void): MarkerVM[] {
  return flagsAll.map((f) => ({
    key: f.id,
    leftPct: (f.atSec / 2700) * 100,
    label: f.conf.toFixed(2),
    title: `${f.cls} at ${f.at}`,
    background: clsColor(f.cls),
    opacity: f.atSec <= t ? 1 : 0.3,
    onClick: () => onJump(f.atSec, f.id),
  }));
}

export interface BreakdownVM {
  cls: Flag["cls"];
  pctText: string;
  barWidthPct: number;
}

export function breakdownFor(): BreakdownVM[] {
  return [
    { cls: "no_ai" as const, pct: 70 },
    { cls: "ide_ai" as const, pct: 8 },
    { cls: "external_ai" as const, pct: 22 },
  ].map((b) => ({ cls: b.cls, pctText: `${b.pct}%`, barWidthPct: b.pct }));
}

export interface SignalVM {
  label: string;
  value: string;
}

export function signalsFor(nowIdx: number, t: number, flagsAll: Flag[]): SignalVM[] {
  return [
    { label: "Typing rhythm", value: `${138 + (nowIdx % 5)} ms` },
    { label: "Backspace rate", value: "8%" },
    { label: "Longest pause", value: t >= 141 ? "18.2 s" : "4.1 s" },
    { label: "Pastes", value: String(flagsAll.filter((f) => f.cls === "external_ai" && f.atSec <= t).length) },
    { label: "Focus losses", value: t >= 123 ? "1" : "0" },
    { label: "Events captured", value: Math.round(t * 3.788).toLocaleString("en-US") },
  ];
}

export interface FlagRowVM {
  flag: Flag;
  clsBg: string;
  clsInk: string;
  outcome: string;
}

export function flagRowInfo(
  f: Flag,
  ctx: {
    editorMode: EditorMode;
    falsePos: Record<number, string>;
    dismissed: Record<number, true>;
    probeSentFor: number | null;
    followupCreated?: boolean;
  },
): FlagRowVM {
  let outcome = "";
  if (ctx.falsePos[f.id]) outcome = "marked false positive · " + (ctx.falsePos[f.id] || "no reason given");
  else if (ctx.dismissed[f.id]) outcome = "dismissed by interviewer";
  else if (ctx.probeSentFor === f.id) outcome = "probe 1 sent · awaiting response · re-check pending";
  else if (isPermitted(f, ctx.editorMode)) outcome = "editor autocomplete was allowed for this round · expected, not a concern";
  else if (ctx.followupCreated) outcome = "included in end-of-interview follow-up";
  return { flag: f, clsBg: clsTagBg(f.cls), clsInk: clsInk(f.cls), outcome };
}

export interface FileEntryVM {
  key: string;
  name: string;
  detail: string;
  isNew: boolean;
}

export function filesFor(followupCreated: boolean): FileEntryVM[] {
  const files: FileEntryVM[] = [
    {
      key: "solution",
      name: "solution.py",
      detail: followupCreated ? "cleared · main round submitted" : "candidate editing",
      isNew: false,
    },
  ];
  if (followupCreated) {
    files.push({
      key: "followup1",
      name: FOLLOWUP_FILE_NAME,
      detail: "created · follow-up round in progress",
      isNew: true,
    });
  }
  return files;
}

export function visibleFlags(flagsAll: Flag[], t: number): Flag[] {
  return flagsAll.filter((f) => f.atSec <= t).slice().reverse();
}

export function shownFlags(flags: Flag[], threshold: number): Flag[] {
  return flags.filter((f) => isShown(f, threshold));
}
