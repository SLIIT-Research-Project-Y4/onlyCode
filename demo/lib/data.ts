import type {
  CompletedInterview,
  Flag,
  ScheduledInterview,
  SystemCheckItem,
  WindowPoint,
} from "./types";

export const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

export const DEFAULT_ROLE_TITLE = "Senior Backend Engineer — Round 2";
export const DEFAULT_PROBLEM =
  "Given a weighted undirected graph and two nodes, return the cost of the cheapest route and the route itself. Weights are non-negative. Aim for O((V+E) log V).";
export const DEFAULT_NOTE =
  "Hi — this is a 45-minute technical round. You'll implement a shortest-path algorithm in Python. The editor's own autocomplete is available. External AI assistants are not permitted for this round. Please join a few minutes early for the system check.";

export const CODE_SRC = [
  "import heapq",
  "from collections import defaultdict",
  "from typing import Dict, List, Optional, Tuple",
  "",
  'INF = float("inf")',
  "",
  "",
  "def _improves(dist, node, cost):",
  "    return cost < dist.get(node, INF)",
  "",
  "",
  "def shortest_path(",
  "    graph: Dict[str, List[Tuple[str, float]]],",
  "    source: str,",
  "    target: Optional[str] = None,",
  ") -> Tuple[Dict[str, float], Dict[str, Optional[str]]]:",
  '    """Dijkstra over a non-negative weighted graph."""',
  "    dist: Dict[str, float] = {source: 0.0}",
  "    prev: Dict[str, Optional[str]] = {source: None}",
  "    seen = set()",
  "    heap: List[Tuple[float, str]] = [(0.0, source)]",
  "",
  "    while heap:",
  "        d, node = heapq.heappop(heap)",
  "        if node in seen:",
  "            continue",
  "        seen.add(node)",
  "",
  "        if target is not None and node == target:",
  "            break",
  "",
  "        for nbr, weight in graph.get(node, ()):",
  "            if nbr in seen:",
  "                continue",
  "            cost = d + weight",
  "            if _improves(dist, nbr, cost):",
  "                dist[nbr] = cost",
  "                prev[nbr] = node",
  "                heapq.heappush(heap, (cost, nbr))",
  "",
  "    return dist, prev",
  "",
  "",
  "def build_graph(edges):",
  "    adj = defaultdict(list)",
  "    for u, v, w in edges:",
  "        if w < 0:",
  '            raise ValueError("negative weight: %r" % (w,))',
  "        adj[u].append((v, w))",
  "        adj[v].append((u, w))",
  "    return dict(adj)",
  "",
  "",
  "def reconstruct(prev, target):",
  "    path: List[str] = []",
  "    node = target",
  "    while node is not None:",
  "        path.append(node)",
  "        node = prev.get(node) if node in prev else None",
  "    path.reverse()",
  "    return path",
  "",
  "",
  'if __name__ == "__main__":',
  '    g = build_graph([("a", "b", 4.0), ("b", "c", 2.0), ("a", "c", 9.0)])',
  '    dist, prev = shortest_path(g, "a", "c")',
  '    print(dist["c"], reconstruct(prev, "c"))',
];

export const FOLLOW_SRC = [
  "# Follow-up: minimum-latency broadcast tree",
  "from typing import Dict, List, Tuple",
  "",
  "",
  "def broadcast_order(links, root):",
  "    ...",
  "",
];

export const FOLLOWUP_FILE_NAME = "followup1.py";

// A simple follow-up built from the single flag the interviewer sent —
// sending any one flag to the candidate closes out the main round and
// opens this file.
export function buildFollowupQuestion(flag: Flag): string {
  return `Before we wrap up, here's a quick follow-up on your submission (lines ${flag.from}–${flag.to}):\n\n${flag.probe}`;
}

export const FLAGS: Flag[] = [
  {
    id: 1,
    from: 12,
    to: 41,
    cls: "external_ai",
    conf: 0.84,
    at: "02:21",
    atSec: 141,
    reason: "412 chars pasted after an 18.2 s pause; window had lost focus",
    before: ["window lost focus at 02:03", "18.2 s with no typing", "focus returned at 02:19"],
    then: ["412 characters in one edit", "0 keystrokes matched them", "0 corrections in the next 20 s"],
    contributions: [
      { label: "Base rate across all sessions", val: 0.35, base: true },
      { label: "Code pasted relative to typed", val: 0.28 },
      { label: "Pause before large code insertion", val: 0.14 },
      { label: "Low correction rate during typing", val: 0.09 },
      { label: "Times candidate left the editor", val: 0.04 },
      { label: "Consistency of typing rhythm", val: -0.02 },
    ],
    counterfactuals: [
      { label: "Had they pasted 50% rather than 89%", score: "0.69" },
      { label: "Had they paused 5 s rather than 18 s", score: "0.71" },
      { label: "Had they corrected 9% rather than 3%", score: "0.72" },
    ],
    segmentStats: [
      { label: "Cyclomatic complexity", value: "12" },
      { label: "Lines in segment", value: "30" },
      { label: "Calls out", value: "8" },
      { label: "Centrality", value: "0.84" },
    ],
    priority: "high priority",
    knowledge: "graph traversal / shortest path",
    probe:
      "Given the same graph, return every node reachable within a latency budget B, and explain why your queue ordering still holds when two edges tie. Write it without reusing the function above.",
  },
  {
    id: 2,
    from: 47,
    to: 49,
    cls: "ide_ai",
    conf: 0.61,
    at: "07:34",
    atSec: 454,
    reason: "47 chars inserted after a single Tab press",
    before: ["steady typing up to 07:33", "1.1 s pause", "one Tab keypress"],
    then: ["47 characters in one edit", "1 keystroke matched them", "backspaces fell to 0% after"],
    contributions: [
      { label: "Base rate across all sessions", val: 0.35, base: true },
      { label: "Chunk arrived on a single keypress", val: 0.18 },
      { label: "Correction rate fell after insertion", val: 0.07 },
      { label: "Chunk matches editor suggestion shape", val: 0.05 },
      { label: "Typing continued in the same rhythm", val: -0.04 },
    ],
    counterfactuals: [
      { label: "Had the chunk been 12 chars rather than 47", score: "0.44" },
      { label: "Had corrections continued at 8%", score: "0.51" },
      { label: "Had autocomplete been off for this round", score: "0.78" },
    ],
    segmentStats: [
      { label: "Cyclomatic complexity", value: "2" },
      { label: "Lines in segment", value: "3" },
      { label: "Calls out", value: "1" },
      { label: "Centrality", value: "0.21" },
    ],
    priority: "low priority",
    knowledge: "input validation",
    probe:
      "Extend build_graph so a repeated edge keeps the cheaper weight, and say what happens to a self-loop. Two or three lines is enough.",
  },
  {
    id: 3,
    from: 58,
    to: 60,
    cls: "external_ai",
    conf: 0.71,
    at: "11:02",
    atSec: 662,
    reason: "203 chars pasted, no matching keystrokes",
    before: ["typing paused at 10:54", "8.4 s with no typing", "focus stayed in the tab"],
    then: ["203 characters in one edit", "0 keystrokes matched them", "2 corrections in the next 20 s"],
    contributions: [
      { label: "Base rate across all sessions", val: 0.35, base: true },
      { label: "Code pasted relative to typed", val: 0.21 },
      { label: "Pause before large code insertion", val: 0.08 },
      { label: "Low correction rate during typing", val: 0.06 },
      { label: "Consistency of typing rhythm", val: 0.01 },
    ],
    counterfactuals: [
      { label: "Had they pasted 40% rather than 74%", score: "0.55" },
      { label: "Had they paused 2 s rather than 8 s", score: "0.63" },
      { label: "Had they corrected 9% rather than 4%", score: "0.66" },
    ],
    segmentStats: [
      { label: "Cyclomatic complexity", value: "3" },
      { label: "Lines in segment", value: "3" },
      { label: "Calls out", value: "2" },
      { label: "Centrality", value: "0.38" },
    ],
    priority: "medium priority",
    knowledge: "path reconstruction",
    probe:
      "Return the path as edges rather than nodes, and handle the case where source equals target. Do not reuse reconstruct().",
  },
];

// Deterministic LCG so the timeline is stable across renders/reloads.
export function buildWindows(): WindowPoint[] {
  let seed = 20260815;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const win: WindowPoint[] = [];
  for (let i = 0; i < 90; i++) {
    win.push({ i, cls: "no_ai", typingFreq: Math.round((0.4 + rnd() * 0.35) * 100) / 100, burst: false });
  }
  const quiet = (i: number, freq: number) => {
    win[i] = { i, cls: "no_ai", typingFreq: freq, burst: false };
  };
  const burst = (i: number, cls: WindowPoint["cls"], freq: number) => {
    win[i] = { i, cls, typingFreq: freq, burst: true };
  };
  // Windows are 30 s wide; indices here line up with FLAGS[*].atSec so the
  // activity log can attach the real flag reason to the right window.
  quiet(3, 0.15);
  burst(4, "external_ai", 0.05); // 02:21 flag — 18.2 s unfocused, then a paste
  quiet(5, 0.22);
  burst(15, "ide_ai", 0.24); // 07:34 flag — short pause, one Tab, small chunk
  quiet(21, 0.1);
  burst(22, "external_ai", 0.07); // 11:02 flag — 8.4 s pause, then a paste
  // An ordinary lull with nothing suspicious after it — not every quiet
  // stretch is a burst.
  quiet(36, 0.09);
  return win;
}

export const SCHEDULED: ScheduledInterview[] = [
  { when: "17 Aug · 10:00", role: "Staff Platform Engineer — Round 1", ref: "C-4519", dur: "60 min", tag: "scheduled" },
  { when: "18 Aug · 14:30", role: "Backend Engineer — Screen", ref: "C-4524", dur: "45 min", tag: "scheduled" },
  { when: "15 Aug · 13:45", role: "Senior Backend Engineer — Round 2", ref: "C-4471", dur: "45 min", tag: "in progress now", live: true },
];

export const COMPLETED: CompletedInterview[] = [
  { when: "14 Aug · 11:00", role: "Senior Backend Engineer — Round 1", ref: "C-4471", dur: "45 min", split: [88, 12, 0], flags: 1 },
  { when: "13 Aug · 15:30", role: "Data Engineer — Round 2", ref: "C-4402", dur: "60 min", split: [54, 6, 40], flags: 5 },
  { when: "12 Aug · 09:15", role: "Backend Engineer — Screen", ref: "C-4388", dur: "30 min", split: [97, 3, 0], flags: 0 },
];

export const SYSTEM_CHECK: SystemCheckItem[] = [
  { label: "Browser", value: "Chrome 128 · supported" },
  { label: "Connection", value: "41 ms · stable" },
  { label: "Editor", value: "loaded · Python 3.11" },
];

export const DURATIONS = ["30", "45", "60", "90"];
export const LANGUAGES = ["Python"];
export const DECISIONS: Array<"Proceed" | "Do not proceed" | "Needs another round"> = [
  "Proceed",
  "Do not proceed",
  "Needs another round",
];
