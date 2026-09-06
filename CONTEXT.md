# CONTEXT.md

The project glossary. These are the canonical terms and spellings; use them in code, schemas, docs and prose. This file is vocabulary only — it records what words mean, never how anything is built.

## Components

The platform has four components, numbered by their owner in the TAF.

- **C1 — Telemetry Infrastructure.** Captures keystroke, edit and environment behaviour in the browser, aligns clocks, stores raw events, and derives windowed feature vectors. Produces the data every other component consumes.
- **C2 — Behavioural Classifier.** A classical machine-learning model (scikit-learn family) that assigns a behaviour class and confidence to each window. Not an LLM.
- **C3 — Adaptive Probing System.** Ranks flagged code by importance, maps it to a knowledge area, and generates targeted follow-up questions. The LLM-heavy component.
- **C4 — Explainability Layer.** Turns a classification into a human-readable explanation for the interviewer, using feature-contribution and counterfactual methods.

> **Superseded usage.** Several documents — C4 throughout, C3's flow diagram, and the TAF's Member 1 and Member 3 task lists — use an inverted numbering in which "C3" means the classifier and "C2" means the prober. That usage is wrong and those documents need correcting. The numbering above is authoritative.

## Session structure

- **Candidate** — the person being interviewed, whose behaviour is captured.
- **Interviewer** — the person reviewing flags and making a decision. The system never decides; it informs.
- **Session** — one interview, from joining to leaving. The unit of consent, of clock alignment, and of re-identification analysis.
- **Task** — a problem the candidate is asked to solve. A session contains at least one, and may gain another when C3 generates a follow-up probe.
- **Submission** — the code a candidate deliberately hands in for a task. Distinct from anything they merely typed.

## Behaviour and capture

- **Event** — one observed occurrence, stamped at the moment it happened in the browser. Three families: **keystroke** (a key going down or up), **edit** (the document changing), and **environment** (focus, visibility, fullscreen and size changes).
- **Origin** — why an edit happened: typed, pasted, undone, redone, reset, or an accepted autocomplete suggestion.
- **Environment event** — a signal that the candidate's context changed. Always recorded, never blocked; the system cannot and does not try to prevent alt-tabbing or a second screen.

## Time

- **Dwell** — how long a single key is held down.
- **Flight** — the interval between one keystroke and the next.
- **Digraph** — an ordered pair of consecutive keys. *Digraph latency* is flight time for one specific pair, and requires knowing which characters were typed.
- **Gap** — elapsed time since the previous typing event. A **pause** is simply a large gap; gaps are treated as a continuous quantity and never reduced to a fixed threshold.
- **Clock offset** — the correction applied to browser-reported time to align it with server time.
- **Load sequence** — a counter that advances when the page reloads. Browser timing is only comparable within a single load sequence, never across one.

## Derived data

- **Window** — the unit of classification: thirty seconds wide, emitted every ten seconds, so consecutive windows overlap. Window width is a research variable, not a constant.
- **Feature vector** — the numeric summary of one window. The single artefact shared across components: C2 classifies it, C4 explains it, and the research studies measure it.
- **Flag** — a window the classifier assigned to a class other than `no_ai` with confidence above the interviewer's threshold. A flag is a prompt for human attention, never a verdict.

## Behaviour classes

- **`no_ai`** — unaided human typing.
- **`ide_ai`** — an IDE assistant's suggestion accepted in the editor.
- **`external_ai`** — content brought in from outside the editor, typically a pause followed by a large insertion with no keystrokes behind it.

## Provenance and truth

- **Condition** — what a participant was *instructed* to do during data collection. A property of the session.
- **Label** — the ground truth for a single window. Distinct from condition, because a participant told to use an external tool still types unaided for most of the session.
- **Editor profile** — the exact editor configuration in force. Training and live use must share one, or feature distributions shift.

## Research vocabulary

- **Degradation** — deliberately damaging a clean captured session to simulate imperfect capture. Three modes, each varied in isolation: dropped events, timestamp jitter, and clock drift.
- **Severity** — how much degradation was applied.
- **Reliability boundary** — the severity at which the classifier's output stops being trustworthy. The headline research result.
- **Re-identification risk** — how readily an individual can be recognised from their feature vectors alone, independent of any name attached.
- **Deidentification** — removing identifying content from captured data before anyone outside the team sees it.
