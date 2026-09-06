# C1 — Input Specification

**Purpose.** The buildable contract for what C1 captures. Written for the developers implementing capture, ingest and the feature extractor, and for C2/C3/C4 owners who need to know exactly what they will receive.

> **In plain terms —** this is the list of everything we record while a candidate types, why we record it, and the traps that will quietly give you wrong numbers if you build it the obvious way. Every section starts with a plain-language summary like this one; the detail underneath it is what you actually implement.

**Relationship to other documents.** This is the foundational specification for C1's inputs and supersedes both `C1-captured-inputs-reference.md` (v3) and `C1_Inputs_Finalized.docx` entirely — both are archived. The brief's §4.1 DDL is superseded outright; the brief remains useful only for architectural rationale. `C1-data-and-capture-feasibility.md` remains the evidence base for browser-API behaviour and is not superseded.

**Status markers**

| | Meaning |
|---|---|
| ✅ | Decided. Build it. Do not reopen without new evidence. |
| 🟠 | Recommended, awaiting confirmation. Build against it; the shape is unlikely to change, but confirm before it becomes load-bearing. |
| ❓ | Open. Do not build on this yet. |
| ⏸️ | Parked deliberately. Not a gap. |

**Scope.** Complete. All input streams are specified: keystrokes (§1–§8), edits (§9), environment (§10), clock synchronisation (§11), session metadata (§12), code (§13), plus the C1/C2 boundary (§14–§15) and data lifecycle (§16).

---

## Quick reference — stored vs calculated

> **In plain terms —** three different things get confused constantly. Some values are measured in the browser and written down. Some are worked out by the server as data arrives, then written down. Some are never written down at all — they are computed later, from the rows that were.

### 1. Captured in the browser and stored

| Table | Columns |
|---|---|
| `events` — all kinds | `session_id`, `task_id`, `load_seq`, `batch_seq`, `perf_now`, `kind` |
| `events` — keystroke (0, 1) | `key_class`, `key_code`, `modifiers`, `is_repeat` |
| `events` — edit (2) | `origin`, `version_id`, `change_index`, `start_line`, `start_col`, `end_line`, `end_col`, `range_offset`, `inserted_len`, `inserted_lines`, `removed_len`, `doc_len`, `inserted_text` (pastes only) |
| `events` — environment (3–7) | `env_state`, `viewport_w`, `viewport_h` |
| `task_submissions` | `code_text`, `version_id`, `submitted_at` |
| `clock_sync_samples` | `t0`–`t3`, `rtt_ms`, `offset_ms`, `accepted` |

### 2. Calculated at ingest and stored

| Column | Computed from |
|---|---|
| `time` | `perf_now` plus the clock offset for that `load_seq` segment (§2) |
| `gap_ms` | Time since the previous typing event, within `(session_id, load_seq, task_id)` (§3.1) |

### 3. Calculated later, never stored on the event row

Everything below is derived in the extractor, so the degradation experiments can perturb the raw inputs and watch these change (§7.3):

| Derived | From |
|---|---|
| **dwell** → `mean_dwell_ms`, `std_dwell_ms` | Pairing each keyup to its keydown by `key_code` |
| **flight** → `mean_flight_ms`, `std_flight_ms` | `gap_ms` between consecutive keydowns |
| `keystroke_count`, `backspace_rate`, `is_repeat_rate`, `unmatched_keyup_rate`, `burst_len` | Keystroke rows (§8) |
| `edit_count`, `paste_ratio`, `inserted_len_sum`/`_max`, `removed_len_sum`, `undo_count`, `redo_count`, `min_line`, `max_line`, `pause_ms` | Edit rows (§9.6) |
| per-digraph latencies | `key_code` pairs — research only (§5) |
| the flagged code segment | Rebasing a line range through edit arithmetic (§13.1) |

### 4. Deliberately never captured

`key_char` (which character was typed) · text typed and then deleted · `keyboard_layout` · a `dwell_ms` column · screen, camera, microphone, other tabs or applications · clipboard content never pasted into the editor. See §17.

---

## 1. Capture surface ✅

> **In plain terms —** where in the code we listen for key presses. The code editor (Monaco) provides its own listeners; we use those rather than attaching to the browser's input box directly. Monaco owns that box and rebuilds it whenever it feels like it, and anything attached to it would stop working with no error message.

Listen through **Monaco's own hooks**, not the DOM directly:

```ts
editor.onKeyDown(e => handle(e.browserEvent, KEYDOWN))
editor.onKeyUp(e   => handle(e.browserEvent, KEYUP))
```

- `e.browserEvent` is the native `KeyboardEvent` and carries everything needed (`code`, `key`, `repeat`, modifier flags).
- Using Monaco's hooks scopes capture to "keys that went to the editor" for free.
- **Do not** locate and attach to Monaco's hidden input element. Monaco manages it and may recreate it at any time; listeners attached to it will silently stop firing.

## 2. Timestamping ✅

> **In plain terms —** we write down the time the moment a key is pressed, before doing anything else at all. Any work done first gets added as error to every timing measurement in the project. We keep two clocks side by side: the browser's own stopwatch exactly as it read, and a corrected version aligned to the server. The raw one is never touched, because the research experiments work by deliberately corrupting it.

`performance.now()` must be read on the **first line** of the handler, before any other work:

```ts
function handle(ev: KeyboardEvent, kind: number) {
  const perfNow = performance.now();   // FIRST. Nothing before this line.
  ...
}
```

Every millisecond of processing done before this read is measurement error added to every downstream timing feature.

Two timestamps are kept per event and are never collapsed into one:

- **`perf_now`** — the raw monotonic browser value, exactly as read. Never adjusted, never overwritten. The degradation experiments perturb this column specifically.
- **`time`** — wall clock, derived server-side by applying the clock offset to `perf_now`. This is the partition and query column.

⚠️ **Offsets apply only within one `load_seq` segment.** `performance.now()` resets to zero on page reload, so an offset computed before a reload is meaningless after it. Never compute `gap_ms` or apply an offset across a `load_seq` boundary.

## 3. The keystroke event record

> **In plain terms —** one database row every time a key goes down, and one every time it comes back up. This section lists every column and what belongs in it.

One row per physical key transition.

### 3.1 Shared columns (present on every event, not just keystrokes)

> **In plain terms —** these columns appear on every kind of event we record: key presses, document edits, and window focus changes alike.

| Field | Type | Status | Notes |
|---|---|---|---|
| `session_id` | UUID | ✅ | One interview. |
| `task_id` | UUID | ✅ | Which problem this event belongs to. Mandatory: tasks interleave, so membership cannot be inferred from timestamps. See §3.4. |
| `load_seq` | INT | ✅ | Increments on page reload. Timing is comparable only *within* one value. |
| `batch_seq` | BIGINT | ✅ | Which delivery batch this event arrived in. Resets to 0 when `load_seq` increments. Not required for deduplication (§6 handles that) — kept for tracing transport problems back to specific events. |
| `time` | TIMESTAMPTZ | ✅ | Server-aligned wall clock. Partition key. |
| `perf_now` | DOUBLE | ✅ | Raw `performance.now()`. Never adjusted. |
| `kind` | SMALLINT | ✅ | `0` keydown, `1` keyup. (`2` edit, `3`–`7` environment — see §9 and §10.) |
| `gap_ms` | DOUBLE | ✅ | Milliseconds since the previous *typing* event (kinds 0–2 only), computed at ingest within `(session_id, load_seq, task_id)`. Environment events must not fracture a pause; a task boundary **does** reset it (§3.4). |

### 3.2 Keystroke-specific columns

> **In plain terms —** these only apply to key presses, and are left empty on other kinds of event.

| Field | Type | Status | Notes |
|---|---|---|---|
| `key_class` | SMALLINT | ✅ | The key's category, not its identity. Always populated. See §4. |
| `key_code` | TEXT | ✅ | `event.code` — the physical key. Stored in every session; all capture is consented. See §5. |
| `modifiers` | SMALLINT | ✅ | Bitmask of modifiers *held* during this event: `1` ctrl, `2` alt, `4` shift, `8` meta. Distinct from a modifier key being pressed on its own, which is `key_class = 9`. |
| `is_repeat` | BOOLEAN | ✅ | `event.repeat`. Auto-repeat from a held key. See §7.2. |

**There is deliberately no `dwell_ms` column.** Dwell is derived in the extractor by pairing keydown to keyup — see §7.3 for why storing it would break the degradation experiments.

### 3.3 Removed from v3

> **In plain terms —** two fields from the earlier design are being deleted. One pretended to protect privacy but didn't; the other can no longer be calculated and nothing was using it anyway.

- **`key_char` hashing is dropped.** ✅ Hashing a single character is not a privacy control — the alphabet is ~100 symbols, so every hash is brute-forced instantly, and frequency analysis defeats even a keyed hash. It was providing no protection while implying protection was present. Character identity is handled by the profile mechanism in §5 instead.
- **`sessions.keyboard_layout` is dropped.** ✅ **QWERTY is assumed and stated as a scope boundary.** v3 derived layout from `key_code`/`key_char` pairs, which no longer works now that `key_char` is not stored. Recording it is not worth the complexity for this project's participant pool, which is effectively all QWERTY. State in the paper's limitations that layout was assumed rather than measured, and that a non-QWERTY candidate would shift timing features (`:` `[` `_` fall under different fingers on AZERTY/QWERTZ) — the same class of confound as programming language, which is already controlled by fixing Python.

### 3.4 Tasks ✅

> **In plain terms —** one interview contains several coding problems, not one. The candidate solves the original question; the interviewer then turns flags from it into follow-up questions, which are separate problems answered in the same sitting. Every event has to record which problem it belongs to, or the numbers get mixed between them.

C3's design is a verification loop, so a session holds a **tree** of tasks:

```
Task 1 (original)  ──► flags F1, F2, F3
    │
    ├─ interviewer picks F1 ──► Task 2 (probe, depth 1) ──► flag F4
    │                                │
    │                                └─ F4 ──► Task 4 (probe, depth 2)
    │
    └─ interviewer picks F3 ──► Task 3 (probe, depth 1)
```

**One flag produces one probing question.** Several probes may be delivered at once, but **the candidate answers strictly one at a time** — a task must be submitted before another can be started. Switching between open questions is not permitted, because interleaved events produce feature vectors that describe two problems at once. Each task therefore has exactly one active interval.

```
tasks
  task_id         UUID PK
  session_id      UUID
  seq             INT              -- chronological creation order
  depth           INT              -- 0 = original, 1 = first-round probe, 2+ deeper
  origin          'original' | 'probe'
  parent_task_id  UUID NULL        -- the task whose flag spawned this
  parent_flag_id  UUID NULL        -- the classification that caused this probe
  created_by      'interviewer' | 'auto'
  status          -- 'pending' | 'active' | 'submitted' | 'expired'
  created_at                       -- probe generated
  delivered_at                     -- appeared in the candidate's list
  started_at                       -- candidate opened it and could type
  submitted_at                     -- answered; final code captured at this moment
```

**Four timestamps, because they are four different moments.** A probe is *created* before it is *delivered*; several may be delivered together but each is *started* separately, one at a time; and *submitted* ends it. `status` exists so a probe that expired against the session time limit is distinguishable from one still in progress — `submitted_at` alone cannot express that. There is no `abandoned` state: a candidate who cannot answer still submits, typing a comment if nothing else.

**Two rules that follow, both of which prevent false positives:**

1. **`gap_ms` resets at a task boundary**, exactly as it resets across a `load_seq` boundary. The interval between the last keystroke of one task and the first of the next spans the whole wait while C2 scores and C3 generates a question. Without the reset, the probe's opening keystroke carries a 30–60 second `gap_ms` — a long pause followed immediately by typing, which is the `external_ai` signature, manufactured by the system's own latency on every session that reaches a probe.
2. **Time belonging to no task is excluded from feature computation.** The interval between one task's `submitted_at` and the next task's `started_at` belongs to no task and is never windowed.

**Validation rule.** Each task's events must form a single contiguous run. Interleaved events mean the one-at-a-time constraint has leaked in the UI; this should fail a data-quality check loudly rather than quietly skew a feature vector.

**Windows are computed per `(session_id, task_id)`.** Every `lag()`, trend and rolling average partitions by both. A window must never span two tasks, and `paste_ratio_prev1` for the first window of a probe must not reach back into the previous problem.

## 4. `key_class` enum ✅

> **In plain terms —** rather than recording *which* letter was typed, we record what *kind* of key it was: a letter, a digit, a symbol, backspace, and so on. That is enough to compute every number the model needs, but a stream reading "letter letter symbol space letter" cannot be turned back into the candidate's source code.

The always-present classification. Chosen so that every feature C2 needs is computable while the typed text stays unreconstructible.

| Value | Class |
|---|---|
| 0 | letter |
| 1 | digit |
| 2 | symbol / punctuation |
| 3 | space |
| 4 | enter |
| 5 | tab |
| 6 | backspace |
| 7 | delete |
| 8 | navigation (arrows, home, end, page up/down) |
| 9 | modifier pressed alone |
| 10 | function key |
| 11 | other / unknown |

Backspace and delete are separate values: `backspace_rate` is a C2 feature, and forward-delete is a different correction behaviour from backspace.

**Why a class and not the character:** a stream reading `letter letter symbol space letter` cannot be turned back into source code. A stream of `key_code` values can be, completely — including text the candidate deleted.

## 5. Consent and capture scope ✅

> **In plain terms —** everyone whose typing is recorded is a recruited volunteer who has signed a consent form. There is no second, lighter capture mode, because there is no unconsented use of this system. The privacy work happens in what we *derive* from the data and what we *release* — not in withholding fields at capture time.

All sessions are consented research sessions, and `key_code` is captured in every one.

`sessions.capture_profile` is retained as a column and currently only ever holds `research`. If the system is later deployed for genuine assessment rather than data collection, a `minimal` mode — `key_class` only, source code unreconstructible — becomes a documented change rather than a redesign. **Do not build that mode now**; it has no users, and a second code path that nothing exercises will drift out of sync with the first.

**What this means for the raw database, stated plainly:** it contains reconstructible source code for every session, including text the candidate typed and then deleted. That is controlled by consent, access control and retention — not by the schema. It is the same arrangement Edwards et al. (JEDM 2023) defended to their ethics board when publishing 505 participants' keystroke data.

**Controls, following Edwards et al.:**

- IRB/ethics consent documents completed before capture, and shipped with any released dataset.
- Deidentification before anyone outside the team sees the data: an automatic pass (each participant's full name and name parts, case-insensitive; a regex for ID numbers) followed by a manual pass by two reviewers.
- Mask found text with `@` — chosen because it is only a matrix-multiply operator in Python, so it does not disturb character or digraph statistics.
- An ethical-use statement published with the dataset.
- Raw event data never leaves the team's controlled environment without deidentification.

**Digraph features are available, but not automatically in production.** Because `key_code` exists in every session, per-digraph timing is computable at inference as well as in training, so train/inference parity does not forbid it. Whether it *belongs* in the production feature set is a question for the accuracy-vs-privacy study: derive feature vectors with and without digraph features, measure re-identification risk for each, and choose on the evidence. That is a measured result rather than an assumption — and it is the same raw data either way, so nothing has to be recollected.

## 6. Reliable delivery and duplicate suppression ✅

> **In plain terms —** the browser collects events into small batches and sends them over the WebSocket. If a batch arrives but its confirmation is lost on the way back, the browser assumes it failed and sends it again — and those events get written twice. The fix is a batch number plus a confirmation from the server, so the browser knows exactly what has landed and the server recognises anything it has already stored.

**Why duplicates matter here specifically.** Duplicated keystrokes inflate `keystroke_count`. `paste_ratio` measures paste volume against typing volume, so inflating the typing side makes a real paste look *smaller* than it was — a genuine `external_ai` event diluted toward looking normal. And it happens most on unstable connections, which is exactly when a candidate has been switching away from the tab.

**No new infrastructure.** All of this runs inside the existing FastAPI WebSocket connection. No broker, no queue, nothing new in the stack.

### 6.1 Wire protocol

Client → server, one message per batch:

```json
{
  "session_id": "abc123",
  "load_seq": 0,
  "batch_seq": 42,
  "events": [ /* the 1–25 events in this batch */ ]
}
```

Server → client, one acknowledgement per batch received:

```json
{ "ack": { "load_seq": 0, "up_to_batch_seq": 42 } }
```

The acknowledgement is **cumulative**: acking 42 means "I hold everything up to and including 42", so the client can discard its whole backlog in one step rather than tracking each batch separately.

`batch_seq` resets to 0 whenever `load_seq` increments, so a page reload starts a clean sequence space instead of colliding with the previous one.

### 6.2 Client

- Keep a `pendingBatches` list, in order. Append on send; **remove only on acknowledgement.**
- On ack, drop every batch with `batch_seq <= up_to_batch_seq`.
- On disconnect or send failure, leave the queue untouched. Reconnect with backoff (1 s → 2 s → 4 s → 8 s, capped around 30 s), then resend the entire pending list in order over the new connection.
- **Cap the queue** at roughly 2,000 events or five minutes of backlog, so a long outage cannot grow memory without bound.

**On overflow: drop oldest, and record it.** Discard the oldest batch, increment `sessions.dropped_event_count`, record the wall-clock span lost, and set `sessions.degraded`. Dropping oldest keeps the most recent five minutes so live scoring resumes correctly. The flag matters more than the data — a session with a known hole must be excludable from training and annotatable in analysis, because otherwise the gap reads as a very long pause, which is the `external_ai` signature again.

### 6.3 Server

```sql
CREATE TABLE ingested_batches (
  session_id UUID,
  load_seq   INT,
  batch_seq  BIGINT,
  PRIMARY KEY (session_id, load_seq, batch_seq)
);
```

On receiving a batch:

1. `INSERT INTO ingested_batches ... ON CONFLICT DO NOTHING`.
2. **Zero rows affected** — this batch is already committed, so the *acknowledgement* was lost, not the batch. Re-send the ack and insert nothing.
3. **One row affected** — insert the events **in the same transaction**, then ack.

⚠️ **Two things that must be right:**

- **The ledger is its own table, not a constraint on `events`.** Every event in a batch shares `(session_id, load_seq, batch_seq)`, so a unique constraint on `events` would reject events 2 through 25 of every batch. A separate table also avoids TimescaleDB's rule that unique indexes on a hypertable must include the partitioning column.
- **The event insert and the ledger insert are one transaction.** If the process dies between them you get either duplicates (events written, batch unrecorded) or silent loss (batch recorded, events not).

### 6.4 Consequence for the degradation study

With reliable delivery in place, real event loss falls to near zero, and when it does occur it is **bursty** — whole batches at the tail of an outage, or the queue cap discarding a contiguous span — rather than uniformly scattered across the session.

The degradation study's random-drop mode therefore models a failure shape this transport rarely produces. That is not a flaw, but it should be stated: uniform random dropping is a hypothetical stress test. Adding **burst loss** as a fourth isolated failure mode would reflect the loss this system actually generates, and would let the reliability boundary report which *shape* of loss the classifier is more sensitive to — a stronger result than severity alone.

## 7. Rules that are easy to get wrong

> **In plain terms —** six things that will produce wrong numbers with no error message if you implement them the obvious way. Each one is small; each one quietly corrupts a feature the classifier depends on.

### 7.1 `keyup` is not guaranteed ✅

> **In plain terms —** if someone alt-tabs while holding a key down, the "key released" event never arrives. Don't guess what it would have been. Mark it unknown, and count how often it happens — that count is itself useful, because it measures how good the capture was.

If focus leaves the window while a key is held, the matching `keyup` may never arrive — alt-tabbing mid-keypress does exactly this.

- **Do not** guess or synthesise a keyup.
- Exclude that keystroke from dwell statistics. There is no `dwell_ms` column to blank out — dwell is derived (§7.3), so an unpaired keydown simply contributes nothing to the average.
- **Count unmatched keydowns.** The unmatched rate is itself a data-quality measure and belongs in the reliability work.

### 7.2 Auto-repeat pollutes timing ✅

> **In plain terms —** holding a key down fires dozens of "key pressed" events per second. Those aren't real typing, so leave them out of the speed averages — but still store and count them, because how often somebody holds keys down is itself a behavioural signal.

Holding a key emits many keydowns with `repeat = true`, usually followed by a single keyup. Dwell for a held key is meaningless.

- Exclude `is_repeat = true` events from **both** dwell and flight statistics.
- Still store them, and still count them — `is_repeat_rate` is a C2 feature.

### 7.3 Dwell pairing ✅

> **In plain terms —** to work out how long a key was held, you match its "pressed" event to its "released" event. Because we store which key each event was, that matching happens server-side in the feature extractor. We deliberately do *not* store a ready-made dwell number.

Pair each keyup to its keydown by `key_code`, within one `load_seq`, in the extractor.

**Rollover makes naive pairing wrong.** Fast typists press the next key before releasing the last, so events arrive in the order `p↓ r↓ p↑ r↑`. Match on key identity, never on arrival order, or every dwell value will be wrong for exactly the fastest typists.

**Do not add a `dwell_ms` column to the event row.** Dwell is derived, not captured. This matters for the research: the degradation experiments work by perturbing `perf_now`, and if dwell were computed at capture time and stored, jittering `perf_now` afterwards would leave it unchanged — the study could not measure how clock jitter affects dwell features. Deriving dwell from the raw paired rows makes the perturbation propagate correctly.

### 7.4 Flight time ✅

> **In plain terms —** the gap between one keypress and the next. We already store this as `gap_ms`. Don't calculate it a second time somewhere else, or the two definitions will drift apart and nobody will know which is right.

Flight is the interval between consecutive keydowns — already available as `gap_ms` on keydown rows. Do not compute it separately; a second definition will drift from the first.

### 7.5 IME input ⏸️

> **In plain terms —** people typing Chinese, Japanese or Korean use a system that doesn't produce one keypress per character, so their genuine typing would look like code appearing from nowhere — a false accusation. We're not supporting those languages, but we add a three-line detector so we find out if such a candidate ever appears.

Out of scope: the project targets English input with Python only. Under an IME, keys may report `key: "Process"` or be swallowed entirely, and the keystroke-to-edit relationship the classifier depends on does not hold — legitimate typing would look like unexplained insertions, a false `external_ai`.

**Cheap insurance, three lines:** add a `compositionstart` listener that sets `sessions.ime_detected = true`. If an IME user appears, you find out rather than silently misclassifying their work. State it in the limitations section as a scoping decision, not an oversight.

### 7.6 Timer resolution ⚠️ Must be measured

> **In plain terms —** browsers deliberately blur their own clocks to stop websites using precise timing to spy on people. We need to find out how blurred, on each browser we support. Our measurements live in the tens of milliseconds; if a browser rounds to the nearest 2 ms, the fine detail that distinguishes one person's typing from another's is already gone before we see it.

`performance.now()` is deliberately coarsened by browsers, variably by browser, version, and cross-origin-isolation state. Dwell and flight operate in tens of milliseconds; if a target browser clamps to 2 ms, the fine structure that distinguishes one person's rhythm from another's is gone.

**Do not assume a number.** Build a framework-free HTML page that measures actual resolution on every target browser and OS before any real data collection. This determines whether the signal survives at all on a given browser.

## 8. Derived keystroke features

> **In plain terms —** the actual numbers handed to the classifier. Each one summarises a 30-second slice of the session, and a new slice is produced every 10 seconds, so consecutive slices overlap.

What the extractor produces per window. Window = **30 s wide, emitted every 10 s** (sliding, overlapping).

| Feature | Definition |
|---|---|
| `keystroke_count` | keydowns in window |
| `mean_dwell_ms`, `std_dwell_ms` | over matched, non-repeat keydowns; derived by pairing (§7.3) |
| `mean_flight_ms`, `std_flight_ms` | over consecutive non-repeat keydowns |
| `backspace_count`, `backspace_rate` | `key_class` 6, and as a fraction of `keystroke_count` |
| `is_repeat_rate` | fraction with `is_repeat = true` |
| `unmatched_keyup_rate` | data-quality measure, §7.1 |
| `burst_len` | keystrokes since the last gap above threshold |
| per-digraph latencies | mean flight for specific key pairs; whether these enter the production feature set is decided by the privacy study (§5) |

**Why 30 s.** At ~2–4 keystrokes/second a 1-second window holds 2–4 keystrokes, and `std_dwell_ms` over 3 samples is noise. 30 s holds roughly 60–120 while actively typing, which is in the band prior work uses (Morales & Fierrez: 100 digraphs; TypeNet: ~250 keystrokes for stability). The 10-second step recovers flag latency without shrinking the sample, mirroring the overlap used by Mehta et al. (1000-keystroke windows, 300 step).

**How the window is built.** TimescaleDB continuous aggregates are *tumbling* buckets — they do not overlap — so a sliding 30 s window is not directly expressible as one. Build it in two layers:

- a **10 s tumbling continuous aggregate** as the base, and
- a **view combining three consecutive buckets** into each 30 s window.

For this to work the base aggregate must store `sum(x)`, `sum(x²)` and `count` for anything needing a standard deviation, rather than storing `std` directly — sums combine across buckets, standard deviations do not. `max(gap_ms)` is fine because maxima combine; an average of averages is not.

**Build only this window for now.** v3 §10-E proposed three aggregates (100 ms / 1 s / 10 s) and the MVP plan proposed four. Neither is needed yet: the window-size sweep is a single experiment run near the end, and raw per-event storage means any size can be computed then without recollecting anything.

**Finding G is closed.** The old 1 s vs 30 s mismatch between C1/C2 and C4 no longer exists: C2 scores once per task and the window is 30 s, so there is nothing to reconcile. v3's fix for it — reinterpreting C4's 30 s as a display rollup of thirty 1 s results — should be **deleted rather than kept**, because it introduced an undefined step of its own: combining thirty separate SHAP vectors into one timeline cell, with no rule anywhere for how. Neither the problem nor that fix survives.

**Window size is a derivation parameter, not a capture parameter.** Raw events are stored per-event, so the same session can be re-bucketed at 100 ms, 1 s or 10 s later for the window-size sweep without recollecting anything. Nothing here forecloses that study.

## 9. Edit events (kind 2) ✅

> **In plain terms —** a keystroke says "they pressed the P key". An edit says "the letter `p` appeared at line 5, column 12". Recording both is the core trick: when someone types, the two match; when someone pastes, 400 characters appear with no keystrokes behind them. That mismatch is the signal, and neither stream can see it alone.

**API:** `editor.onDidChangeModelContent`, which fires synchronously after every content change. This is the most reliable capture point in the system — a stable, documented API carrying `versionId`, `isUndoing`, `isRedoing`, `isFlush`, and a `changes` array whose entries carry `range`, `rangeOffset`, `rangeLength` and `text`.

### 9.1 Columns ✅

| Field | Notes |
|---|---|
| `origin` | Why the change happened — §9.2 |
| `version_id` | Monaco's model version. The anchor for line rebasing (§13.1) |
| `change_index` | Position within a multi-change event — §9.3 |
| `start_line`, `start_col`, `end_line`, `end_col` | The range that was **replaced** — §9.3 |
| `range_offset` | Character offset of the change within the document |
| `inserted_len`, `inserted_lines` | What went in. Both are needed — §9.3 |
| `removed_len` | What came out |
| `doc_len` | Document length after this change — §9.5 |
| `inserted_text` | Pastes only — §13.2 |

### 9.2 `origin` values ✅

| Value | Detected by |
|---|---|
| `typed` | default |
| `pasted` | `onDidPaste` correlation |
| `undo` | `isUndoing` |
| `redo` | `isRedoing` |
| `reset` | `isFlush` — a programmatic replacement (§9.4) |
| `autocomplete_accepted` | Suggest widget visible plus an accept keypress — **reserved, not implemented** |

**Paste correlation.** `onDidPaste` fires *after* the content change, so the row is written as `typed` and corrected to `pasted` microseconds later, while it is still in the 250 ms send buffer — no database update required.

This does not have to be perfect. A 412-character insertion with zero keystrokes in the same window is the signal regardless; `origin = pasted` is a convenient label, not the detection mechanism. A missed label costs tidiness, not a finding.

**`autocomplete_accepted` is defined but not built.** It can only occur under an editor profile with suggestions *enabled*, and the standard profile disables them all — so in the current system a candidate can never accept a suggestion. Detection would need the suggest-widget context key plus the accept keybinding, and there is no stable public API for it. Define the value now, implement it alongside the suggestions-enabled profile for the `ide_ai` class: adding an enum value later is a migration, leaving one unused costs nothing.

### 9.3 Four traps ✅

**One event can carry several changes.** Find-and-replace-all arrives as a single event containing every replacement. **Write one row per change**, sharing `version_id`, distinguished by `change_index`.

**The range describes what was *replaced*, not what was *added*.** This is the one that catches people:

```
Type one character "x" at line 5:
   range = line 5 col 3 → line 5 col 3,  text = "x"

Paste 30 lines at line 5:
   range = line 5 col 3 → line 5 col 3,  text = "...30 lines..."
```

Both ranges are a single point, because in neither case was anything replaced. The range alone therefore cannot distinguish one keystroke from a thirty-line paste. **`inserted_lines` must be counted from the inserted text and stored** — without it, every line number below a paste is wrong, and the line rebasing in §13.1 silently produces garbage.

**Changes-array ordering is unverified.** Monaco is *expected* to return changes in descending offset order, so they can be applied in sequence without invalidating the positions of later ones. Confirm this before relying on it for reconstruction — §13.1 depends on applying changes in the correct order.

**Your own code fires the same event.** Loading a starter template produces a content change indistinguishable from the candidate typing it. See §9.4.

### 9.4 Programmatic edits ✅

Programmatic changes are **recorded, with `origin = reset`, and excluded from feature computation.**

Both halves matter:

- **Record them**, because §13.1 replays edits to work out where lines moved. If the starter template load is missing, the replay begins from a document containing content that was never recorded, and every subsequent line calculation is wrong.
- **Exclude them from features**, because a template load is a large insertion with zero keystrokes behind it — the `external_ai` signature exactly. Without this the system flags its own setup code as cheating, on every session.

This is the same pattern as excluding the inter-task waiting gap (§3.4): the event exists so reconstruction works, but never reaches the classifier.

Use an explicit suppression flag around your own edits, and `isFlush` to catch whole-document replacements.

### 9.5 `doc_len` — a cheap integrity check ✅

> **In plain terms —** after each change, also record how long the document is now. Then you can check your own work: replay every edit from the start and see whether you end at the same length as the file that was actually submitted. If not, events went missing.

`batch_seq` gaps (§6) detect loss in *transport*. `doc_len` detects loss anywhere, including bugs in the capture code itself. One integer per row, and it gives the reliability study a second independent measure of real data loss to compare its simulated rates against.

### 9.6 Derived edit features ✅

> **In plain terms —** the numbers computed from edits for each window, alongside the keystroke ones in §8.

| Feature | Definition |
|---|---|
| `edit_count` | Edits in the window |
| `typing_edit_count` | `origin = typed` |
| `paste_edit_count` | `origin = pasted` |
| `paste_ratio` | `paste_edit_count / max(edit_count, 1)` |
| `inserted_len_sum`, `inserted_len_max` | Sum and maximum of `inserted_len` |
| `removed_len_sum` | Sum of `removed_len` |
| `undo_count`, `redo_count` | `origin = undo` / `redo` |
| `min_line`, `max_line` | Lowest and highest line touched — §14.2 |
| `pause_ms` | `max(gap_ms)` in the window. `gap_ms` spans kinds 0–2, so a pause is measured across both typing and edits |

⚠️ **`origin = reset` is excluded from every feature above** (§9.4). Including it would count your own template load as a large keystroke-free insertion — the `external_ai` signature.

## 10. Environment events (kinds 3–7) ✅

> **In plain terms —** we record when the candidate leaves the editor window, comes back, switches tab, exits full screen, or resizes. These are recorded as signals and never blocked. A window losing focus and then a large paste arriving is strong evidence — but the browser can only ever tell us that focus left, never where it went.

| `kind` | Event | Source |
|---|---|---|
| 3 | blur | `window.addEventListener('blur')` |
| 4 | focus | `window.addEventListener('focus')` |
| 5 | visibility change | `document.visibilitychange` |
| 6 | fullscreen change | `fullscreenchange` |
| 7 | resize | `window.resize` |

Columns: `env_state` (the new state, e.g. hidden/visible, entered/exited full screen) plus `viewport_w`, `viewport_h`.

Derived features: `blur_count`, `focus_count`, `visibility_change_count`, and a combined `focus_switch_count`.

**Recorded, never blocked.** A browser tab cannot prevent alt-tab, a second monitor, or a screenshot. Attempting OS-level lockdown is an explicit non-goal; only in-page controls are enforceable.

**Throttle resize.** A single drag fires the event continuously. Throttle to roughly one event per 250 ms, or a window resize floods the batch queue and displaces real keystrokes.

⚠️ **Environment events must never fracture a pause.** `gap_ms` is computed across kinds 0–2 only (§3.1). If a blur reset the gap, a candidate who left the window for two minutes would return with `gap_ms` near zero, erasing exactly the pause that matters most.

**Interpretation boundary, to state in the paper.** Blur says focus left the window, never where it went. Blur *with* a visibility change means a tab switch; blur *without* one means another window on the same screen. Neither, nor the pair, can see a second physical device or a phone. State this as a boundary, not a bug.

## 11. Clock synchronisation ✅

> **In plain terms —** the browser's stopwatch and the server's clock don't agree. We measure the difference by bouncing timestamped messages back and forth, then use that difference to convert every browser timestamp into a real wall-clock time.

NTP-style, over the same WebSocket as the event stream. The client sends `t0`; the server records `t1` on receipt and `t2` on reply; the client records `t3` on arrival:

```
offset = ((t1 − t0) + (t2 − t3)) / 2
```

Send repeated pings and keep the **median offset from low-RTT samples only** — a slow round trip carries more uncertainty about where in that interval the server actually read its clock.

```
clock_sync_samples
  session_id, load_seq
  t0, t1, t2, t3
  rtt_ms, offset_ms
  accepted            -- whether this sample fed the median
```

**Persist every sample, including rejected ones.** They describe the network conditions the reliability study needs; discarding them throws away the only record of how bad the connection was.

⚠️ **The reload reconciliation is specified but not built, and is the highest-risk silent bug in C1.** `performance.now()` restarts near zero on page reload, so an offset computed before a reload is meaningless after it. Required behaviour: re-run the handshake on **every** reconnect, and compute `gap_ms` and apply offsets **only within one `load_seq` segment** (§2). The column exists; nothing reads it correctly yet. Roughly twenty lines.

**How the failure manifests**, which matters because it produces no error: events after a reload get stamped with times near the session's *start*. Anything older than the continuous aggregate's look-back window is then silently dropped from every feature vector — no exception, no warning, just missing rows. It lands hardest on candidates who switch away and return, which is precisely the `external_ai` pattern the project exists to detect.

**How the failure actually manifests**, which is worth knowing because it produces no error: `performance.now()` restarts near zero on reload, so events after a reload are stamped with times near the session's *start*. Anything older than the continuous aggregate's look-back window is then silently dropped from every feature vector — no exception, no warning, just missing rows. It lands hardest on candidates who switch away and return, which is precisely the `external_ai` pattern the project exists to detect.

## 12. Session metadata ✅

> **In plain terms —** one row per interview, holding who it was, what machine they used, and a few flags about how well the capture went.

```
sessions
  session_id, candidate_id      -- candidate_id links sessions for the re-identification study
  language                      -- the programming language; digraph timing differs by language
  started_at, ended_at
  final_offset_ms               -- the clock offset actually applied, kept for audit
  capture_profile               -- §5; currently always 'research'
  user_agent, platform
  screen_w, screen_h, viewport_w, viewport_h, device_pixel_ratio
  locale, timezone              -- circadian and language context
  editor_profile, editor_config_hash
  ime_detected                  -- §7.5
  dropped_event_count, degraded -- §6.2
```

**`editor_profile` / `editor_config_hash` earn their place**: they let the team prove that `ide_ai` can only occur under the suggestions-enabled profile, and that the configuration used to collect training data matched the one used at inference. A mismatch shifts feature distributions and breaks the classifier silently.

**No `keyboard_layout`** — QWERTY is assumed and stated as a limitation (§3.3).

**Ground truth lives on the task, not the session.** C2 scores per task (§14), and a participant is instructed per task, so:

```
tasks.condition   -- 'no_ai' | 'ide_ai' | 'external_ai', what the participant was told to do
```

No per-window label table is needed, because nothing is classified per window.

*Privacy note:* `user_agent` together with screen dimensions and `device_pixel_ratio` approaches a device fingerprint. Since `candidate_id` already links sessions by design for the re-identification study, this adds no new risk — but it is worth knowing it is redundant with an already-accepted trade-off rather than a fresh one.

## 13. Code capture ✅

> **In plain terms —** C1 keeps two things: the code the candidate submitted, once per task, and the text of anything they pasted. Nothing else — no periodic snapshots of work in progress, and no record of text they typed and then deleted. The flagged snippet C3 asks for is normally cut out of the submitted file on demand, using arithmetic to work out where those lines ended up.

**What C3 needs:** the flagged code segment and the full submitted solution.

Normally the segment is derived from the submission (§13.1). Paste text is stored as well, because a paste is flagged the moment it happens and a candidate may delete it before submitting — leaving C3 a flag pointing at code that no longer exists, and nothing to build a question from (§13.2).

**What C1 stores:**

```
task_submissions
  task_id       UUID
  session_id    UUID
  version_id    BIGINT        -- the document version that was submitted
  submitted_at  TIMESTAMPTZ
  code_text     TEXT          -- the submitted file, exactly as handed in
```

One row per task. The original problem and each probe answer are separate submissions (§3.4).

**What C1 does not store:** periodic full-file snapshots, text the candidate typed and then deleted, or a `flagged_segments` table.

v3 §7.2's reactive AST extraction is **dropped**. C3 parses code itself with `ast`/tree-sitter and computes call-graph centrality and entry-function detection, both of which need the whole file. C1 extracting a fragment would duplicate C3's parsing while withholding what C3 actually needs.

### 13.1 Deriving the flagged segment ✅

> **In plain terms —** a flag points at line numbers, but line numbers shift as the candidate keeps typing above them. Before that range means anything you have to work out where those lines ended up in the submitted file. You can do that with arithmetic from the edit records — no stored text needed.

A flag records a line range against a document `version_id`. To rebase it onto the submitted version, each edit event supplies:

```
lines removed = end_line − start_line
lines added   = inserted_lines
net delta     = inserted_lines − (end_line − start_line)
```

Move line *L* from version V to the submitted version by adding the net delta of every edit between them that occurred **above** *L*.

**Worked example.** A flag at version 100 covers lines 40–45. Three later edits above line 40 add 12 lines, remove 3, and add 1 — net **+10**. At submission those lines are **50–55**. C3 receives that rebased range together with the full file.

If *L* falls inside a span that was removed, return **"this region was deleted"** explicitly. Never silently remap it onto whatever code now occupies those line numbers — that would hand C3 an innocent function and invite a question about code the candidate never wrote.

### 13.2 Pasted content ✅

> **In plain terms —** when someone pastes into the editor, we store what they pasted. This is the one piece of text C1 keeps that the candidate did not deliberately hand in, and it is kept because a pasted block is exactly what a follow-up question gets built from — and it may be gone from the file by the time anyone looks.

`inserted_text TEXT NULL` on the edit event, populated **only** when `origin = pasted`. Left `NULL` for every other origin.

**Why it cannot be deferred or captured selectively.** Flags arrive after windowing and classification, so at the moment of a paste there is no way to know whether it will be flagged. Either every paste is captured or none is.

**Capture path.** The DOM `paste` event exposes `event.clipboardData.getData('text')` with no permission prompt — a different and easier route than `navigator.clipboard.readText()`, which requires permission and a user gesture.

**Cap the stored text** at a sensible size (100 KB is generous for source code) and record the true size regardless. `inserted_len` already carries the real length, so an oversized paste is still measured correctly even if its text is truncated.

⚠️ **This is the most sensitive data C1 holds.** A paste can contain anything the candidate had on their clipboard — Edwards et al. found a live meeting invitation in exactly this position. It must be named explicitly in the ethics submission and in the consent form, and it must be covered by the deidentification pass in §5. It is not merely "code".

**Optional privacy refinement, worth considering later:** once classification has run, the text of pastes that were never flagged could be deleted, keeping only lengths. That reduces the stored surface to the pastes that are actually used. Do not build it now — it would complicate the C2 synthetic-data work, which benefits from realistic paste content.

### 13.3 Stated limitations ✅

**Typed-then-deleted text is not recoverable, deliberately.** C1 records that characters were deleted, and how many, but never what they were. This is where private content concentrates — Edwards et al. report that 58% of typed characters are eventually deleted, and their manual review found student names present only in the deleted stream. Not capturing it is a decision, not a gap.

**Behavioural detection cannot survive a human or script typing an AI's answer at realistic speed.** No missing keystrokes, plausible timing, nothing resembling a paste. The literature quantifies this: a forged-keystroke attack pushes a gradient-boosting detector's false-rejection rate **past 93%**. This is not a C1 gap to fix; it is a limitation to state in the paper before an examiner states it for you.

## 14. Feature vectors and the C1/C2 boundary ✅

> **In plain terms —** every 10 seconds C1 boils the last 30 seconds of typing down to a row of numbers. Those rows are saved. C1 stops there: it never decides that anything is suspicious. C2 reads the rows after the candidate submits, and it alone decides what counts as a flag.

**C1 captures and summarises. C2 judges.** C1 emits no flags, no scores and no verdicts.

**C2 scores per task, not per window.** 30 seconds of typing is too little to classify reliably, so C2 waits for submission and evaluates the task as a whole. Windows are an intermediate representation on the way to that score, not something anyone reads directly.

**What C1 stores:**

```
feature_vectors
  session_id, task_id
  window_start, window_end
  run_id                  -- 'live' for real capture; other values for degraded copies
  features   JSONB
```

Keyed naturally by `(session_id, task_id, window_start, run_id)` — no surrogate id is needed, because nothing outside C1 joins back to individual rows.

**Why store them at all**, now that C2 scores per task and C4 explains that score? Two of C1's own experiments need them: the re-identification study compares per-candidate feature vectors, and the degradation study compares vectors computed from clean versus damaged copies of the same session. `run_id` is what keeps those apart.

**JSONB rather than one column per feature**, because the feature list will keep moving during development and a wide table means a migration for every change. The `pandera` schema in `shared_features/` validates on write, so the flexibility does not cost correctness. Revisit if the feature list ever settles.

**What C2 stores** — flags and the task-level score. C1 does not define or write these; `tasks.parent_flag_id` (§3.4) references a row C2 owns.

**The threshold is C2's, and lives in the model.** C2 sets the confidence threshold that turns a score into a flag; C1 neither stores nor applies it. It must live *inside the model artifact* rather than in editable config, so it cannot change without producing a new `model_version` — otherwise `model_version` stops being a reliable record of what was actually applied, and an old report can no longer be reproduced.

### 14.1 Degraded copies stay out of `events` ✅

> **In plain terms —** the degradation experiment makes damaged copies of a real session. Those copies are never written to the events table. They are built in memory, run through the same extractor, and only the resulting feature vectors are saved.

`events` records what actually happened, and nothing else. Degradation is analysis, not capture.

Writing damaged copies into `events` would multiply the table by (failure modes × severities) and leave every query and continuous aggregate silently mixing real and synthetic rows unless it filtered correctly. A single forgotten `WHERE run_id = 'live'` would contaminate the clean baseline with no visible symptom.

Instead: read a clean session into Pandas, damage it in memory, run it through the same extractor, and persist only the resulting rows with their `run_id`. The comparison the study needs — clean feature vectors against damaged ones — works identically, and baseline contamination becomes structurally impossible rather than something to remember.

### 14.2 Code range per window ✅

A flag has to tell C3 *which code* to ask about. Only one of C2's anomaly types carries that naturally:

| Anomaly | Locates code? |
|---|---|
| Paste event | Yes — the edit records `start_line`–`end_line` |
| Typing burst | No — a time range only |
| Absence of typing errors | No |
| Uniform keystroke intervals (manual copying) | No |

So each window also carries **`min_line` and `max_line`** — the lowest and highest line touched by edits inside it. Any flag then carries a code range rather than only a timestamp, and §13.1's rebasing maps it onto the submitted file.

### 14.3 Anomaly coverage ✅

C2's four anomaly types are all computable from features already specified — no additional capture is required:

| Anomaly | Feature |
|---|---|
| Typing burst | `keystroke_count`, `burst_len` |
| No typing errors | `backspace_rate` near zero |
| Uniform intervals — copying by hand from another screen | **low** `std_flight_ms`; human typing is irregular, transcription is metronomic |
| Copy-paste | `origin = pasted`, `inserted_len`, `paste_ratio` |

## 15. One feature registry ✅

> **In plain terms —** every fact about a feature lives in one file: its name, its type, its valid range, the plain-English label the dashboard shows, and how to display it. C2 and C4 read that file rather than keeping their own copies.

The same features were previously described in three places — C1's pandera schema, C2's `FeatureMeta` sidecar, and C4's dashboard labels. Three lists of one thing drift, and the labels were owned by nobody at all.

**One file in `shared_features/`, as data rather than code**, so a label can be corrected without touching C1's source:

```yaml
backspace_rate:
  dtype:        float
  unit:         fraction
  valid_range:  [0.0, 1.0]
  label:        "Correction rate while typing"
  description:  "How often the candidate deleted and retyped"
  display_as:   percent          # 0.03 renders as "3%"
  actionable:   true             # C4's counterfactuals may suggest changing it
```

`display_as` exists because the interface and the schema use different units: C4's mockups show "a pause of 18 seconds" and "89% pasted" while the stored values are `18200` and `0.89`. Without an owner for that conversion the dashboard renders "18200 seconds".

C2 supplies the `actionable` values, since actionability is a modelling judgement — but as entries here, not as a second file.

**The test that this is working:** adding a feature means editing exactly one file. If it ever means editing three, it will soon mean editing two and forgetting the third.

This one blocks C2 and C4 rather than C1, so it should land before they start building against features.

## 16. Retention and data lifecycle ✅

> **In plain terms —** keep everything until the project is finished, then delete the raw data. Do not set the database to delete things automatically while the research is still running.

**Do not use the 90-day retention policy from the brief.** `add_retention_policy('events', INTERVAL '90 days')` would silently destroy data collected in month one before the analysis in month eight ever ran, with no warning.

**Two tiers with different needs:**

| | Sensitivity | Needed until |
|---|---|---|
| `events`, `inserted_text` | Highest — reconstructible source code and clipboard content | The degradation study is finished. It perturbs `perf_now` and re-extracts, so it cannot run on feature vectors alone. |
| `feature_vectors` | Much lower — numbers only | The write-up is finished. This is what the re-identification study uses. |

**Policy:** no automatic deletion during the project. Delete raw events and paste text manually once the degradation study is complete; feature vectors may outlive them.

⚠️ **State the retention period generously in the consent form.** You can delete early, but you cannot extend without re-consenting every participant — which in practice means losing the data. Analysis overruns. State twelve months, delete as soon as the work is done.

**Record the deletion date somewhere that is not a person's memory.** The failure mode is quiet: nobody deletes anything, and a year later an unattended database holds students' reconstructible source code and clipboard contents.

**A deidentified published dataset is a separate artifact** with no deletion date — that is what deidentification is for (§5).

## 17. What C1 never captures ✅

> **In plain terms —** the hard boundaries, written down so an examiner finds them stated rather than discovering them missing.

Screen contents, camera, microphone, other tabs or applications, clipboard content that was never pasted into the editor, anything outside the browser tab, keystrokes outside the editor, and the text of anything the candidate typed and then deleted (§13.3).

**Webcam / eye tracking / head pose:** ⏸️ parked. See `C1-eye-tracking-feasibility.md`. Not a gap — a deliberate decision, currently on hold.

## 18. Remaining gates ✅

> **In plain terms —** every design question is now decided. What is left are things to *do* before collecting real data, not things to decide.

All twelve open decisions are closed. Three gates remain before data collection — process, not design:

| Gate | Why it blocks collection |
|---|---|
| **Ethics submission covering paste content** | `inserted_text` is the most sensitive store in C1 (§13.2). Collecting it without approval makes the whole corpus unusable. |
| **Timer-resolution probe** (§7.6) | If a target browser coarsens `performance.now()` too heavily, dwell and flight carry no signal there. Better learned before recruiting than after. |
| **Consent wording matched to capture** | Must state that source code, pasted content and keystroke timing are recorded, and for how long (§16). Cannot be asked retrospectively. |

Neither of the first two blocks development — build against this spec now.

## 19. Decisions register

> **In plain terms —** every decision taken while finalising these inputs, and where each one is written up.

| # | Decision | Outcome | Section |
|---|---|---|---|
| 1 | Key identity | One capture path. `key_code` + `key_class` in every session, all capture consented. `key_char` hashing dropped — it protected nothing against a ~100-symbol alphabet. | §3.2, §4, §5 |
| 2 | Tasks | `task_id` on every event; `tasks` table modelling the probe tree. Candidate answers strictly one task at a time. `gap_ms` resets at task boundaries. | §3.4 |
| 3 | Reliable delivery | Batch-level `batch_seq` with cumulative acks, a client retry queue with backoff and a bounded cap, and an `ingested_batches` ledger for idempotent writes. | §6 |
| 4 | Code capture | The submitted file per task, plus `inserted_text` for pastes. No periodic snapshots, no typed-then-deleted text, no `flagged_segments` table. | §13 |
| 5 | Keyboard layout | Dropped. QWERTY assumed and stated as a limitation. | §3.3 |
| 6 | Windows | Build one: 30 s wide, 10 s step, from a 10 s tumbling aggregate plus a combining view. Other sizes deferred to the sweep. | §8 |
| 7 | C1/C2 boundary | C1 stores feature vectors for its own studies and emits no flags or scores. C2 decides flags and scores per task at submission. | §14 |
| 8 | Finding G | Closed. The 1 s vs 30 s mismatch no longer exists; v3's display-rollup fix deleted with it. | §8 |
| 9 | Degraded copies | Degradation runs in memory. `events` records only what actually happened. | §14.1 |
| 10 | Feature registry | One data file in `shared_features/` holding every fact about a feature. C2 and C4 import it. | §15 |
| 11 | Threshold | Lives inside the model artifact, so `model_version` alone records what was applied. | §14 |
| 12 | Retention | No automatic deletion during the project. Consent states twelve months. | §16 |
| 13 | Edit `origin` | Six values; `autocomplete_accepted` defined but not implemented until the suggestions-enabled profile exists. | §9.2 |
| 14 | Programmatic edits | Recorded as `origin = reset`, excluded from every feature. | §9.4 |
| 15 | `doc_len` | Stored per edit as an integrity check that catches lost events anywhere, not just in transport. | §9.5 |
| — | Eye / head tracking | **Parked.** See `C1-eye-tracking-feasibility.md`: the accuracy gap is 10–25×, it fails when the head turns away, and a CV pipeline would inject jitter into the timing measurements C1 exists to make. | §17 |

## 20. Changelog

| Date | Change |
|---|---|
| 2026-09-05 | First issue. Keystroke capture finalised: capture surface, timestamping, event record, `key_class`, capture profiles, `client_seq`, correctness rules, derived features. Dropped `key_char` hashing and `keyboard_layout`. Window set to 30 s sliding / 10 s step. Eye tracking parked. |
| 2026-09-05 | Added plain-language summary to every section. |
| 2026-09-06 | **Foundational release.** Sections 10–12 written in full (environment events, clock synchronisation, session metadata), so v3 is fully superseded and archived. Added a stored-vs-calculated quick reference and a decisions register. Ground truth placed on `tasks.condition`; no per-window label table needed now that scoring is per task. |
| 2026-09-06 | Absorbed the two facts that existed only in `C1_Inputs_Finalized.docx`: the reload bug's silent-drop mechanism (§11) and the 93% false-rejection figure for forged-keystroke attacks (§13.3). That document is now fully superseded. |
| 2026-09-06 | Consistency pass: removed a stale `dwell_ms` reference in §7.1; added §9.6 listing derived edit features, which were previously specified nowhere. |
| 2026-09-06 | **Decisions 13–15 — edit events.** Full §9: columns, six `origin` values (`autocomplete_accepted` reserved), the four Monaco traps, programmatic edits recorded as `reset` but excluded from features, and `doc_len` as an integrity check. Sections renumbered with stubs added for environment, clock-sync and session metadata so future work needs no further renumbering. |
| 2026-09-06 | **Decision 12 — retention.** No automatic retention policy during the project; the brief's 90-day auto-delete is rejected as it would destroy data mid-study. Raw events and paste text kept until the degradation study completes, then deleted manually; feature vectors may outlive them. Consent to state twelve months. |
| 2026-09-06 | **Decision 11 — threshold.** No extra columns. C2 sets the threshold and it lives inside the model artifact, so `model_version` alone records what was applied. `background_ref` left to C4. |
| 2026-09-06 | Restructured: feature vectors, the feature registry and retention promoted to top-level sections (§10–§12); open-decision list replaced by remaining process gates. |
| 2026-09-06 | **Decision 10 — one feature registry.** All feature metadata consolidated into a single data file in `shared_features/`: name, dtype, unit, range, plain-English label, description, display unit, actionability. C2 and C4 import it instead of maintaining their own lists. |
| 2026-09-06 | **Decision 9 — degraded copies.** Degradation happens in memory (Pandas), never in `events`. Only the resulting feature vectors are persisted, separated by `run_id`. Keeps the clean baseline uncontaminatable by construction. |
| 2026-09-06 | **Decision 8 — Finding G closed.** The 1 s vs 30 s window mismatch is resolved by construction: C2 scores per task, windows are 30 s. v3's display-rollup fix is deleted, along with the undefined SHAP-combination step it implied. |
| 2026-09-05 | **Decision 7 — feature vectors and the C1/C2 boundary.** C1 stores window feature vectors (JSONB, natural key, `run_id`) for its own re-identification and degradation studies; no surrogate id, since nothing external joins to them. C1 emits no flags or scores — C2 decides flags and scores per task at submission, not per window. Added `min_line`/`max_line` per window so behavioural flags carry a code range. Confirmed all four C2 anomaly types are computable from existing features. |
| 2026-09-05 | **Decision 6 — windows.** Build one window now: 30 s wide / 10 s step, as a 10 s tumbling continuous aggregate plus a view combining three buckets. Base aggregate stores sum, sum-of-squares and count so standard deviations combine. Other window sizes deferred to the sweep. |
| 2026-09-05 | **Decision 5 — keyboard layout.** Field dropped. QWERTY assumed and stated as a limitation rather than measured. |
| 2026-09-05 | **Decision 4 — code capture.** C1 stores the submitted file per task (`task_submissions`) plus `inserted_text` for pastes. No periodic snapshots, no typed-then-deleted text. Dropped v3 §7.2's `flagged_segments` table and C1-side AST extraction; C3 parses. Flagged segments derived by rebasing line ranges through edit arithmetic; paste text covers the case where flagged code is deleted before submission. Paste content named as the most sensitive store, requiring explicit ethics and consent coverage. |
| 2026-09-05 | **Decision 3 — reliable delivery.** Replaced per-event `client_seq` with batch-level delivery: `batch_seq`, cumulative acks, client retry queue with backoff and a bounded cap, and an `ingested_batches` ledger giving idempotent writes. Overflow drops oldest and marks the session degraded. Noted that real loss is bursty, not uniform, and proposed burst loss as a fourth degradation mode. |
| 2026-09-05 | **Decision 2 — tasks.** Added `task_id` to every event and a `tasks` table modelling the probe tree (`parent_task_id`, `parent_flag_id`, `depth`). Candidate answers strictly one task at a time; no switching, so no task-switch event kind. Four timestamps plus `status`. `gap_ms` resets at task boundaries; time belonging to no task is excluded from features. Windows partition by `(session_id, task_id)`. |
| 2026-09-05 | **Decision 1 — key identity.** One capture path: `key_code` and `key_class` stored in every session, all capture consented. Dropped the two-profile split (second path had no users). Removed the `dwell_ms` column — dwell is derived in the extractor so degradation can perturb it. `capture_profile` retained, single-valued. Digraph availability decoupled from capture; inclusion in production decided by the privacy study. |
