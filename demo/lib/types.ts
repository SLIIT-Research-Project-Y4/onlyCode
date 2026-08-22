export type FlagClass = "no_ai" | "ide_ai" | "external_ai";

export type Role = "interviewer" | "candidate";
export type IScreen = "list" | "create" | "link" | "live" | "report";
export type CScreen = "join" | "consent" | "wait" | "code";
export type CodeTab = "solution" | "followup";

export interface Contribution {
  label: string;
  val: number;
  base?: boolean;
}

export interface Counterfactual {
  label: string;
  score: string;
}

export interface Stat {
  label: string;
  value: string;
}

export type Priority = "high priority" | "medium priority" | "low priority";

export interface Flag {
  id: number;
  from: number;
  to: number;
  cls: FlagClass;
  conf: number;
  at: string;
  atSec: number;
  reason: string;
  before: string[];
  then: string[];
  contributions: Contribution[];
  counterfactuals: Counterfactual[];
  segmentStats: Stat[];
  priority: Priority;
  knowledge: string;
  probe: string;
}

export interface WindowPoint {
  i: number;
  cls: FlagClass;
  conf: number;
}

export interface Token {
  text: string;
  cls?: "comment" | "string" | "num" | "kw" | "fn";
}

export interface CodeLineView {
  n: number;
  tokens: Token[];
  flag: Flag | null;
  muted: boolean;
  badgeText: string;
}

export interface ScheduledInterview {
  when: string;
  role: string;
  ref: string;
  dur: string;
  tag: string;
  live?: boolean;
}

export interface CompletedInterview {
  when: string;
  role: string;
  ref: string;
  dur: string;
  split: [number, number, number];
  flags: number;
}

export interface SystemCheckItem {
  label: string;
  value: string;
}

export type EditorMode = "off" | "allowed";
export type Decision = "Proceed" | "Do not proceed" | "Needs another round";
