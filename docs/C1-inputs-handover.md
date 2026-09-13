# C1 → C2 · What Telemetry Captures

**For:** Member 2, Behavioural Classifier
**Full detail:** `C1-input-specification.md` — section numbers below point into it. Read that when you need the *why*; this document is the *what*.

---

## In one paragraph

C1 records everything that happens in the code editor — every key press and release, every document change, every time focus leaves the window, every code run — each stamped with the exact moment it happened. Those raw events are summarised into **30-second windows, emitted every 10 seconds**, and those summaries are what you classify. C1 never decides anything is suspicious; that is entirely yours.

---

## 1 · Session — one row per interview

| Field | What it is | Why it's stored | Matters to you because |
|---|---|---|---|
| `session_id` | The interview | Primary key | |
| `candidate_id` | The person | Links their sessions together | **Split train/test by this.** Two sessions from one person in different splits leaks identity and inflates your accuracy |
| `language` | Programming language | Timing differs by language | Fixed to Python for now; a confound if it ever varies |
| `started_at` / `ended_at` | Session bounds | | |
| `editor_profile`, `editor_config_hash` | Exact editor configuration | Proves the setup was identical | **`ide_ai` can only occur under the suggestions-enabled profile.** Also: the config used to collect training data must equal the one at inference, or feature distributions shift |
| `capture_profile` | Currently always `research` | Reserved for a future minimal mode | Ignore for now |
| `multi_screen` | Second display attached at start | Blur means more on a dual-monitor machine | Three-valued — `false` may mean *"browser can't tell"* (Chromium only). Never read it as "single screen" |
| `ime_detected` | Candidate used a CJK input method | Their typing breaks our assumptions | **Exclude these sessions.** Keystroke-to-edit mapping doesn't hold |
| `dropped_event_count`, `degraded` | Known data loss | Honesty about capture quality | **Exclude degraded sessions from training.** A hole reads as a long pause |
| `user_agent`, `platform`, screen/viewport size, `locale`, `timezone` | Device context | Timer-coarsening check, circadian context | |

## 2 · Task — one row per problem within a session

A session contains the original problem **plus each follow-up probe** C3 generates.

| Field | What it is | Matters to you because |
|---|---|---|
| `task_id` | Which problem | Every event carries it. **Windows never span two tasks** |
| `condition` | What the participant was *told* to do — `no_ai` / `ide_ai` / `external_ai` | **This is your training label.** Per task, not per window |
| `seq`, `depth` | Order and probe depth | `depth 0` is the original problem |
| `origin`, `parent_task_id`, `parent_flag_id` | Probe lineage | Which flag caused this question to exist |
| `status` | `pending` / `active` / `submitted` / `expired` | Skip anything not `submitted` |
| `created_at`, `delivered_at`, `started_at`, `submitted_at` | Four distinct moments | Time belonging to **no** task is excluded from features |

📖 §3.4

---

## 3 · Raw events

Every event carries: `session_id`, `task_id`, `load_seq`, `batch_seq`, `time`, `perf_now`, `kind`, `gap_ms`.

| Field | What it is | Why it's stored |
|---|---|---|
| `time` | Server-aligned wall clock | Query and partition column |
| `perf_now` | Raw browser timer, never adjusted | The degradation experiment perturbs this specifically |
| `gap_ms` | Milliseconds since the previous typing event | Pauses stay window-size-independent. **Resets at task boundaries** and across page reloads |
| `load_seq` | Increments on page reload | Timing is only comparable *within* one value |
| `batch_seq` | Delivery batch | Gaps here mean genuine transport loss |

### Keystrokes — `kind` 0 (down) and 1 (up)

| Field | What it is | Matters to you because |
|---|---|---|
| `key_class` | Category: letter · digit · symbol · space · enter · tab · backspace · delete · navigation · modifier · function · other | `backspace_rate` comes from class 6 |
| `key_code` | The physical key (`KeyA`, `Semicolon`) | Needed to pair a key-up with its key-down, and for per-digraph timing |
| `modifiers` | Ctrl / Alt / Shift / Meta held | |
| `is_repeat` | Auto-repeat from holding a key | **Exclude from dwell and flight** — a held key has no meaningful hold time. Still counted as `is_repeat_rate` |
| `is_trusted` | Real keypress vs one a script faked | **Zero in an honest session.** Any non-zero value is worth surfacing on its own |

📖 §3.2, §7.7

### Document changes — `kind` 2

| Field | What it is | Matters to you because |
|---|---|---|
| `origin` | `typed` · `pasted` · `undo` · `redo` · `reset` · `autocomplete_accepted` | **`reset` is our own template load — exclude it from every feature.** It looks exactly like a large paste |
| `inserted_len`, `inserted_lines` | What went in | A 30-line paste reports a single-point range, so `inserted_lines` is the only way to know its size |
| `removed_len` | What came out | |
| `start_line`, `start_col`, `end_line`, `end_col`, `range_offset` | Where it landed | Gives each window a code range |
| `version_id` | Document version | Anchors a flag's line range so it can be rebased later |
| `change_index` | Position within a multi-change event | One find-and-replace = many changes, one event |
| `doc_len` | Document length after the change | Replay check — proves nothing was lost |
| `inserted_text` | The pasted text, **pastes only** | What C3 builds a follow-up question from |
| `paste_origin` | `internal` / `external` / `unknown` | **Cutting a line and repositioning it is not cheating.** Without this it looks identical to pasting from ChatGPT |

📖 §9

### Environment — `kind` 3–7

Focus lost · focus gained · tab hidden or shown · full screen entered or left · window resized.
Carries `env_state` plus viewport size.

⚠️ **Blur tells you focus left the window — never where it went.** Blur *with* a visibility change means a tab switch; blur *without* one means another window on the same screen. Neither sees a second device.

📖 §10

### Code runs — `kind` 8–9

| Field | What it is | Matters to you because |
|---|---|---|
| `run_id` | Pairs a start with its finish | |
| `exit_status` | `ok` / `error` / `timeout` | `runs_before_first_success` is a strong signal — write your own code and you fail then fix; paste working AI code and it passes first time |
| `browser_duration_ms` vs `sandbox_time_ms` | Total wait vs actual execution | The difference is queue and network. A slow queue is a pause the candidate didn't cause |

📖 §11

### Clipboard, session, display — `kind` 10–14

Copy · cut · page closing · network online/offline · **display connected or disconnected mid-session**.

| Field | Matters to you because |
|---|---|
| `source_pane` | `editor` · `problem_statement` · `output`. **Copying the problem statement is the strongest signal here** — copying your own code to move it is ordinary, copying the *question* is not |
| `copied_len` | Length only. The text is never stored |

📖 §10.1, §13.1

---

## 4 · Code

`task_submissions` — the submitted file, once per task, with the `version_id` it was submitted at.

Typed-then-deleted text is **never** stored. You know a deletion happened and how big it was, never what it said.

📖 §14

---

## 5 · What you actually consume — the feature vector

One row per window. **30 seconds wide, emitted every 10 seconds.**

**From keystrokes** — `keystroke_count` · `mean_dwell_ms` · `std_dwell_ms` · `mean_flight_ms` · `std_flight_ms` · `backspace_count` · `backspace_rate` · `is_repeat_rate` · `unmatched_keyup_rate` · `burst_len` · per-digraph latencies

**From edits** — `edit_count` · `typing_edit_count` · `paste_edit_count` · `paste_ratio` · `inserted_len_sum` · `inserted_len_max` · `removed_len_sum` · `undo_count` · `redo_count` · `min_line` · `max_line` · `pause_ms`

**From runs** — `run_count` · `runs_before_first_success` · `time_to_first_run` · `edits_between_runs` · `run_error_rate`

**From environment** — `blur_count` · `focus_count` · `visibility_change_count` · `focus_switch_count` · `copy_count` · `problem_copy_count` · `copy_before_blur`

Every field's exact name, type, unit and valid range lives in **one file** in `shared_features/` — import it, don't redeclare it. Adding a feature means editing that one file.

📖 §8, §9.6, §16

---

## 6 · Five things that will bite you

**Windows overlap.** 30 seconds wide, 10 seconds apart — consecutive windows share two-thirds of their data. **They are not independent samples.** Splitting windows randomly into train and test leaks badly. Split by participant.

**`origin = reset` is our template load.** A large insertion with zero keystrokes — the `external_ai` signature exactly. Exclude it or you'll train on our own setup code.

**`gap_ms` resets at task boundaries.** The first gap of a probe is *not* a 60-second think-pause; it's the wait while C3 generated the question.

**Four things manufacture a false `external_ai`.** Long pause then a burst of typing also happens when: C3 is generating a probe · the page reloaded · the template loaded · code was running. Each is handled in the data, but know they exist.

**Your labels are per task, not per window.** `tasks.condition` is what the participant was *instructed* to do. A participant told to use ChatGPT still types unaided for most of the session — so window-level truth is weaker than the task label implies.

---

## 7 · The boundary

**C1 captures and summarises. C2 judges.** C1 emits no flags, no scores, no verdicts.

That separation is deliberate: C1's research measures how a **fixed, unmodified** classifier reacts to damaged input. That only works if C1 never touches your model.

**Synthetic data:** C1 builds the generator — it must emit raw events through the *same* extractor real telemetry uses, which is what makes synthetic and real features identical by construction. **You define the personas** — what typing behaviour each of the three classes actually looks like.

📖 §15
