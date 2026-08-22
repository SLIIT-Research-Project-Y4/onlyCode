import { clsColor, clsInk, clsTagBg, fmt, isPermitted, isShown } from "./logic";
import type { EditorMode, Flag, WindowPoint } from "./types";

export interface CellVM {
  key: number;
  height: number;
  background: string;
  title: string;
  onClick?: () => void;
}

export function cellsFor(
  windows: WindowPoint[],
  threshold: number,
  nowIdx: number,
  onScrubTo?: (sec: number) => void,
): CellVM[] {
  return windows.map((w) => {
    const past = w.i <= nowIdx;
    const h = 12 + Math.round(w.conf * 34);
    const flagged = w.cls === "ide_ai" ? true : w.conf >= threshold;
    const bg = !past
      ? "color-mix(in srgb, var(--color-text) 7%, transparent)"
      : flagged
        ? clsColor(w.cls)
        : `color-mix(in srgb, var(--color-text) ${Math.round(18 + w.conf * 90)}%, transparent)`;
    return {
      key: w.i,
      height: past ? h : 12,
      background: bg,
      title: `${fmt(w.i * 30)} · ${w.cls} ${w.conf.toFixed(2)}`,
      onClick: onScrubTo ? () => onScrubTo(w.i * 30) : undefined,
    };
  });
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
  ctx: { editorMode: EditorMode; falsePos: Record<number, string>; dismissed: Record<number, true>; probeSentFor: number | null },
): FlagRowVM {
  let outcome = "";
  if (ctx.falsePos[f.id]) outcome = "marked false positive · " + (ctx.falsePos[f.id] || "no reason given");
  else if (ctx.dismissed[f.id]) outcome = "dismissed by interviewer";
  else if (ctx.probeSentFor === f.id) outcome = "probe 1 sent · awaiting response · re-check pending";
  else if (isPermitted(f, ctx.editorMode)) outcome = "editor autocomplete was allowed for this round · expected, not a concern";
  return { flag: f, clsBg: clsTagBg(f.cls), clsInk: clsInk(f.cls), outcome };
}

export function visibleFlags(flagsAll: Flag[], t: number): Flag[] {
  return flagsAll.filter((f) => f.atSec <= t).slice().reverse();
}

export function shownFlags(flags: Flag[], threshold: number): Flag[] {
  return flags.filter((f) => isShown(f, threshold));
}
