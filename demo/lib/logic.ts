import { tokenizeLine } from "./tokenize";
import type { CodeLineView, EditorMode, Flag, FlagClass } from "./types";

export function fmt(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

export function clsColor(cls: FlagClass): string {
  if (cls === "external_ai") return "var(--color-accent)";
  if (cls === "ide_ai") return "#ff9784";
  return "var(--color-neutral-400)";
}

export function clsInk(cls: FlagClass): string {
  if (cls === "external_ai") return "var(--color-accent-700)";
  if (cls === "ide_ai") return "var(--color-accent-2-700)";
  return "var(--color-neutral-700)";
}

export function clsTagBg(cls: FlagClass): string {
  if (cls === "external_ai") return "var(--color-accent-200)";
  if (cls === "ide_ai") return "var(--color-accent-2-100)";
  return "var(--color-neutral-200)";
}

export function isPermitted(f: Flag, editorMode: EditorMode): boolean {
  return f.cls === "ide_ai" && editorMode === "allowed";
}

export function isShown(f: Flag, threshold: number): boolean {
  return f.cls === "ide_ai" ? true : f.conf >= threshold;
}

export function flagFor(
  n: number,
  flags: Flag[],
  threshold: number,
  falsePos: Record<number, string>,
  activeOnly: boolean,
  t: number,
): { flag: Flag; muted: boolean } | null {
  for (const f of flags) {
    if (n < f.from || n > f.to) continue;
    if (!isShown(f, threshold)) continue;
    if (activeOnly && f.atSec > t) continue;
    return { flag: f, muted: !!falsePos[f.id] };
  }
  return null;
}

export function buildCodeLines(
  src: string[],
  opts: {
    flags: boolean;
    offset?: number;
    flagList?: Flag[];
    threshold?: number;
    falsePos?: Record<number, string>;
    t?: number;
    editorMode?: EditorMode;
  },
): CodeLineView[] {
  const offset = opts.offset ?? 0;
  return src.map((text, idx) => {
    const n = idx + 1 + offset;
    const hit = opts.flags
      ? flagFor(n, opts.flagList ?? [], opts.threshold ?? 0, opts.falsePos ?? {}, true, opts.t ?? 0)
      : null;
    let badgeText = "";
    if (hit && n === hit.flag.from) {
      if (hit.muted) badgeText = "false positive";
      else {
        badgeText = hit.flag.cls + " " + hit.flag.conf.toFixed(2);
        if (opts.editorMode && isPermitted(hit.flag, opts.editorMode)) badgeText += " · allowed";
      }
    }
    return {
      n,
      tokens: tokenizeLine(text),
      flag: hit ? hit.flag : null,
      muted: hit ? hit.muted : false,
      badgeText,
    };
  });
}
