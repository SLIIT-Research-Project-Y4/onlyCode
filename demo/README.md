# CodeTrace prototype demo

A frontend-only mockup of CodeTrace, the interview-integrity platform this
project is building. There is no backend and no database — every value
(sessions, flags, confidence scores, timelines) is mock data in
`lib/data.ts`, and all interaction is local React state.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/login`.

Sign in with either of the two demo accounts shown there (no password
check, it's a mock). To see the interviewer ↔ candidate interaction —
sending a follow-up probe and watching it appear live — open the app in
**two tabs of the same browser**, sign in as a different role in each.
Login is per-tab (`sessionStorage`), so this works without one role
kicking the other out.

## Structure

- `app/login/` — the two demo accounts; picking one sets a per-tab
  session and redirects.
- `app/interviewer/` — interviewer app shell and state (current screen,
  session clock, flags, thresholds). Header nav is just Interviews and
  Live room; New / Link / Report are reached by clicking through the UI
  (new-interview button, table rows), not nav links.
- `app/candidate/` — candidate app shell. The flow is linear
  (join → consent → waiting → interview) with no nav to jump around
  once joined; a follow-up probe from the interviewer appears inline in
  the interview screen's sidebar and as a second editor tab, not as a
  separate screen.
- `components/RequireRole.tsx` — per-page auth guard, redirects to
  `/login` or the other role's page if the session doesn't match.
- `components/CodeEditor.tsx` — the candidate's actual editable code
  area (plain `<textarea>` + a synced line-number gutter). The
  interviewer's mirrored/report views stay the read-only, flag-annotated
  `CodeLines` renderer — see "Why not Monaco" below.
- `lib/liveChannel.ts` — `BroadcastChannel` used only to relay "probe
  sent" from the interviewer tab to the candidate tab in the same
  browser. Stands in for a backend; doesn't work across machines.
- `components/screens/` — one component per screen.
- `lib/data.ts` — mock sessions, flags, and code samples.
- `lib/logic.ts` / `lib/derive.ts` — pure helpers that turn that data
  into what a screen renders (timeline cells, flag rows, syntax tokens).

## Why not Monaco

The candidate's code panel is a styled `<textarea>` with a line-number
gutter, not `@monaco-editor/react`. Monaco would be easy to wire up
(client-only import, CDN-loaded core, no bundler plugin needed) and is
the real project's eventual editor choice — but for this mockup it's
extra weight for capability nothing here uses: no autocomplete, no
LSP, no multi-file model. It would also mean re-doing the flag
highlighting (colored line bars, badges) on the interviewer's mirror
and report views via Monaco's decorations API, for a view that never
needed to be editable in the first place. The textarea gets "typable"
with no new dependency and stays visually identical to the rest of the
hand-built design system.
