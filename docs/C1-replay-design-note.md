# C1 — Session Replay: Design Note

**Status:** design note, not a commitment. Nothing here changes what C1 captures — everything described is possible with the data already specified in `C1-input-specification.md`.

---

## What this is

A viewer that lets an interviewer watch how a solution was written: the code appearing over time, pauses visible as pauses, and pasted blocks arriving all at once.

It is not the same thing as C4. C4 explains *why the model scored a session the way it did*, in terms of feature contributions. Replay shows *what actually happened*, with no model involved. C4's own document positions itself as the alternative to watching a replay — so this is a separate artifact, not part of C4.

## Three levels, and what each needs

**Level 1 — activity timeline.** Typing rate over time, pauses, pastes marked, focus losses. Every input already stored. This is what the prototype shows.

**Level 2 — structural replay.** The document growing: blocks of the correct size appearing at the correct positions and times, contents not shown. Needs edit positions and sizes, which are stored.

**Level 3 — partial content replay.** The real text appearing as it was written.

This works because C1 stores the submitted file plus every edit's position and size. Replaying the position arithmetic forward maps each surviving character back to the edit that inserted it, so it can be shown appearing at the right moment.

**What cannot be shown:** text that was typed and later deleted. C1 deliberately never stores it (`C1-input-specification.md` §13.3). It appears as a placeholder block of the correct size — *something was here, and it was removed*.

**Pastes replay exactly**, because their text is stored (§13.2).

## A property worth noticing

The privacy design means **the content an interviewer most needs to examine is fully visible, and ordinary typing is the part that is redacted.** Pasted blocks — the actual evidence — replay perfectly. A candidate's abandoned drafts do not. That is a good place to have landed, and it is worth stating in the write-up as a deliberate property rather than a limitation.

Calibration: Edwards et al. report that 58% of typed characters are eventually deleted, so a replay will contain a substantial amount of placeholder content. The final solution builds up correctly; experimentation along the way shows as blocks.

## The strongest argument for building it

Replay is **exculpatory**, not only investigative.

Edwards et al. make the point directly: a student can use playback "to prove that they used a different process to come up with a similar program."

This system produces accusations. A replay the *candidate* can also see turns a flag from a verdict into something they can answer. For a project whose stated aim is fairness and trust in technical interviews, that is a substantive contribution rather than a convenience — and a strong paragraph in the paper.

## What it needs from C1

**Nothing new.** Every input is already specified:

| Needed | Where |
|---|---|
| Every edit's position and size | §9.1 |
| Ordering within multi-change events | `change_index`, §9.1 |
| Timestamps | §3.1 |
| The submitted file | §13 |
| Paste text | §13.2 |
| Correctness check | `doc_len`, §9.5 |

Two consequences for the spec:

**§9.3's unverified item now has a second consumer.** Whether Monaco returns changes in descending offset order matters for line rebasing *and* for replay — both walk edits forward to compute positions. Worth confirming early.

**`doc_len` doubles as a replay validator.** At each step the reconstructed document's length must match the stored `doc_len`. Divergence means the reconstruction logic is wrong, and pinpoints which edit broke it.

## Implementation notes

From teams who have built one:

- **Play at roughly 15 Hz.** At 4 events per second, six million events would take over 400 hours to watch.
- **Clamp pauses to about 5 seconds.** Otherwise the viewer sits watching nothing through an 18-second think-pause.
- Provide speed control and the ability to jump straight to flagged moments.
- Scope playback to one task (§3.4), not a whole session.

Prior art: Edwards et al. released **KeystrokeExplorer** (`github.com/edwardsjohnmartin/KeystrokeExplorer`) as an open-source viewer over ProgSnap2 data. Worth reading before building, and a precedent for releasing this as a research artifact.

## Open questions

- **Who sees it?** Interviewer only, or the candidate too? The exculpatory argument only holds if the candidate can view it.
- **Is it live or post-hoc?** Post-hoc is simpler and matches C2 scoring at submission.
- **Whose deliverable?** Not C4's. Most naturally a C1 tool, since C1 owns the data and it is releasable alongside the dataset.
- **Does the placeholder show length?** A block of the exact deleted size reveals more than a generic marker. Probably harmless, worth a moment's thought.
