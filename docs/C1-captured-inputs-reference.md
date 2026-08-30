# C1 Telemetry — captured inputs reference

Every field C1 records, what it looks like, how it is stored, and why it exists.

Examples follow one scenario throughout: a candidate types Python, pauses 18 seconds, switches away, returns, and pastes a 29-line function at line 12.

---

## 1. Session metadata — `sessions`

One row per interview.

| Input | Example | Data type | Why we capture it |
|---|---|---|---|
| `session_id` | `3f9a2c14-8e7b-4d21-9f03-5a6b7c8d9e01` | `UUID` | Primary key. Every event, feature row and clock sample joins on it |
| `candidate_id` | `7b21e5f0-3a44-4c9d-8e12-0f5a9b3c7d22` | `UUID` | Groups multiple sessions to one person. The re-identification experiment needs several sessions per candidate to measure how distinguishable their typing is |
| `language` | `python` | `TEXT` | Digraph timing differs significantly between programming languages. Mixing them would confound the features |
| `started_at` / `ended_at` | `2026-08-30 10:12:04+05:30` | `TIMESTAMPTZ` | Session boundaries. Also bounds every window query |
| `final_offset_ms` | `-38.2` | `DOUBLE PRECISION` | The clock offset actually used. Kept for auditing — lets you recompute `time` from `perf_now` later |
| `user_agent` | `Mozilla/5.0 (X11; Linux x86_64)…` | `TEXT` | Browser and OS identification. Different browsers coarsen timers differently, which affects timing features |
| `screen_w` / `screen_h` | `1920` / `1080` | `INTEGER` | Makes viewport size meaningful. A 960px window is half of a 1920 screen but the whole of a 1024 one |
| `viewport_w` / `viewport_h` | `1280` / `720` | `INTEGER` | Starting window size — the baseline every later resize event is compared against |
| `device_pixel_ratio` | `1.5` | `REAL` | Proxy for device class. Helps separate laptop from external-monitor setups |
| `platform` | `Linux` | `TEXT` | Operating system. Key auto-repeat rate and delay are OS-level settings that shift timing features |
| `keyboard_layout` | `qwerty` | `TEXT` | Derived from `key_code`/`key_char` pairs, not from a browser API. Needed for keyboard-agnostic evaluation |
| `locale` | `en-US` | `TEXT` | Browser language. **Not** `language`, which holds the coding language |
| `timezone` | `Asia/Colombo` | `TEXT` | Local time of day. Prior work found circadian effects on typing rhythm |
| `editor_profile` | `PROFILE_NO_SUGGEST` | `TEXT` | Which editor configuration ran. `ide_ai` can only occur under the suggestions-enabled profile |
| `editor_config_hash` | `a3f8b2c91d4e…` | `TEXT` | Hash of the exact editor options. Turns "training config must match inference config" from an assumption into something a test can verify |

---

## 2. Every event — `events`, shared columns

Present on all eight event kinds.

| Input | Example | Data type | Why we capture it |
|---|---|---|---|
| `time` | `2026-08-30 10:14:32.882+05:30` | `TIMESTAMPTZ` | Server-aligned wall clock. The hypertable partition key and the column every window buckets on |
| `session_id` | `3f9a2c14-…` | `UUID` | Which session. Every window function partitions by this so features never cross candidates |
| `kind` | `2` | `SMALLINT` | `0` keydown · `1` keyup · `2` edit · `3` blur · `4` focus · `5` visibility · `6` fullscreen · `7` resize. One table holds all of them because a continuous aggregate can only read a single hypertable |
| `perf_now` | `1284932.4` | `DOUBLE PRECISION` | Raw `performance.now()` stamped at capture, never adjusted. Monotonic, so dwell and flight are computed from it. **The degradation experiment perturbs this column to simulate clock drift** — the reason it is stored separately from `time` |
| `gap_ms` | `18200.4` | `DOUBLE PRECISION` | Milliseconds since the previous typing event. Produces `pause_ms`, and a long pause followed by a large insertion is the `external_ai` signature. Computed across kinds 0–2 only, so a blur cannot chop a pause in half |
| `load_seq` | `0` | `SMALLINT` | Increments when the page reloads. `performance.now()` restarts at zero on reload, so gaps and offsets must never be computed across a boundary |

---

## 3. Keystroke events — `kind` 0 and 1

Two rows per physical keypress: one down, one up.

| Input | Example | Data type | Why we capture it |
|---|---|---|---|
| `key_code` | `KeyD` | `TEXT` | The physical key, independent of layout. Per-key and per-digraph timing are the strongest features in the keystroke-dynamics literature. Also one half of the layout derivation |
| `key_char` | `d` | `TEXT` | The character produced. Distinguishes `a` from `A`, and pairing it with `key_code` reveals the keyboard layout without any browser API |
| `modifiers` | `4` | `SMALLINT` | Bitmask — Ctrl 1, Alt 2, Shift 4, Meta 8. Identifies Ctrl+V, Ctrl+Z, and whether Shift produced a capital |
| `is_repeat` | `false` | `BOOLEAN` | True when a held key is auto-repeating. Repeats must be excluded from dwell and flight or they corrupt both. Also yields the `is_repeat_rate` feature |

**Derived from these:** `keystroke_count`, `backspace_count`, `backspace_rate`, `mean_dwell_ms`, `std_dwell_ms`, `mean_flight_ms`, `std_flight_ms`.

---

## 4. Edit events — `kind` 2

One row per change. A single editor action can produce several.

| Input | Example | Data type | Why we capture it |
|---|---|---|---|
| `origin` | `1` | `SMALLINT` | `0` typed · `1` pasted · `2` undo · `3` redo · `4` reset · `5` autocomplete accepted. Drives `paste_ratio`, `undo_count`, `redo_count`, `accept_count` |
| `version_id` | `847` | `BIGINT` | Document version counter. Groups the several changes produced by one action, and links an edit to the matching code snapshot |
| `inserted_len` | `412` | `INTEGER` | Characters added. **The core discriminator** — 412 characters appearing alongside zero keystrokes is the paste signature. Yields `inserted_len_sum` and `inserted_len_max` |
| `removed_len` | `0` | `INTEGER` | Characters removed. Large deletions indicate rework; yields `removed_len_sum` |
| `inserted_lines` | `29` | `SMALLINT` | Newlines in the inserted text. Without it a 29-line paste looks like it landed on a single line, and C3 receives a point instead of a range |
| `start_line` | `12` | `INTEGER` | Where the change began. Monaco counts from 1, not 0 |
| `start_col` | `1` | `INTEGER` | Column where the change began |
| `end_line` | `12` | `INTEGER` | End of the **replaced** range — equals `start_line` for a plain insertion |
| `end_col` | `1` | `INTEGER` | End column of the replaced range |
| `range_offset` | `1847` | `INTEGER` | Character position from the start of the file. The difference between consecutive edits gives cursor jump distance, separating linear writing from hopping around |

**Why the positions matter downstream:** C2 hands C3 a `code_range` of `{start_line, end_line, start_col, end_col}`, and C3 uses it to pull the exact flagged lines out of the solution.

---

## 5. Environment events — `kind` 3 to 7

Recorded, never blocked.

| Input | Example | Data type | Why we capture it |
|---|---|---|---|
| `kind = 3` blur | — | `SMALLINT` | The window stopped being active. Blur followed by a large paste is the strongest evidence in the system. Fires for side-by-side windows and second monitors, where tab visibility does not |
| `kind = 4` focus | — | `SMALLINT` | The window became active again. The gap between blur and focus measures how long they were elsewhere |
| `kind = 5` visibility | — | `SMALLINT` | Tab hidden or shown. Catches tab switching and minimising, which blur alone cannot distinguish |
| `kind = 6` fullscreen | — | `SMALLINT` | Entered or left fullscreen. Leaving cannot be prevented — Escape always works — so it is recorded as a signal |
| `kind = 7` resize | — | `SMALLINT` | Window size changed. Throttled to 100 ms so one drag does not flood the stream |
| `env_state` | `0` | `SMALLINT` | `0` hidden / left fullscreen · `1` visible / entered fullscreen. One column serves both, mirroring how the browser reports them |
| `viewport_w` / `viewport_h` | `960` / `1040` | `INTEGER` | Size after a resize. Half the screen width suggests something is open beside the editor |

**Derived from these:** `blur_count`, `focus_count`, `visibility_change_count`.

**The pair is informative on its own:** blur *with* a visibility change means a tab switch; blur *without* one means another window on the same screen.

---

## 6. Clock synchronisation — `clock_sync_samples`

One row per ping, roughly 20 at connect then one every 30 seconds.

| Input | Example | Data type | Why we capture it |
|---|---|---|---|
| `t0` | `12843.2` | `DOUBLE PRECISION` | Browser time when the ping was sent |
| `t1` | `1787998872140.0` | `DOUBLE PRECISION` | Server time on receipt |
| `t2` | `1787998872141.0` | `DOUBLE PRECISION` | Server time on reply |
| `t3` | `12851.8` | `DOUBLE PRECISION` | Browser time when the reply arrived |
| `rtt_ms` | `7.6` | `DOUBLE PRECISION` | `(t3 − t0) − (t2 − t1)`. Only low-RTT samples are trusted — a slow round trip carries a biased offset |
| `offset_ms` | `-38.2` | `DOUBLE PRECISION` | `((t1 − t0) + (t2 − t3)) / 2`. Converts browser time to server time |
| `accepted` | `true` | `BOOLEAN` | Whether this sample fed the median. **Rejected samples are stored too** — they describe network conditions, which the reliability experiment needs |

`t0` and `t3` are browser timer values; `t1` and `t2` are server epoch milliseconds. Mixing them is correct — the formula yields exactly the number that converts one to the other.

---

## 7. Code — pending ethics approval

Not yet decided. Everything above is.

| Input | Example | Data type | Why we capture it |
|---|---|---|---|
| `content` | `"def dijkstra(graph, start):\n    …"` | `TEXT` | Periodic snapshot of the whole file. C3 must parse the flagged code, score its complexity and generate a question about it — none of which is possible from lengths alone. Snapshots also resolve line numbers, which shift as the file grows |
| `inserted_text` | `"def dijkstra(graph, start):\n    …"` | `TEXT` | Text of paste events only. The code most worth examining, and what C2 needs for realistic synthetic data |

**Deliberately not stored:** a character-by-character history. 58% of typed characters are deleted before submission, and deleted text is where accidental private content ends up.

---

## What we never capture

Screen contents · camera · microphone · other tabs or windows · other applications · clipboard contents not pasted into the editor · anything outside the browser tab · keystrokes outside the editor.

A browser tab cannot observe these, and the system does not attempt to.

---

## Volume

Roughly 4,000–6,000 event rows for a 45-minute session — about two per keystroke plus edits and environment changes. Around 1 MB before compression, and TimescaleDB compresses this shape well.
