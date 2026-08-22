# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

**Pre-implementation.** The only tracked files are `README.md` and `.gitignore`; `docs/` is untracked. There is no source code, no package manifests, no tests, and no build tooling yet.

The two documents in `docs/` are the specification:

- `docs/telemetry-project-brief.md` — the authoritative build spec for this repo (data model, SQL DDL, capture layer, feature contract, target directory layout, ordered bootstrapping steps). **Read this before writing any code.**
- `docs/IT4010-TAF-2026-J26-SE-369.md` — the four-member academic assessment form. Gives the wider system context and defines which tasks belong to this repo's author (Member 1, Telemetry Infrastructure) versus teammates.

The brief closes with a note that it is **not finalized** and invites suggested updates. Where the brief already makes a design choice, follow it. Where it marks something *(decide)*, ask rather than improvising.

Once scaffolding lands, replace this section with the real build/test/lint/run commands.

## What this repo is

One component of a four-component AI-powered interview-integrity platform. The platform detects AI-assisted cheating from *how* code is written (keystroke and edit dynamics), not from what is submitted, classifying each time window as `no_ai`, `ide_ai` (Copilot-style accepted completion), or `external_ai` (pause → large paste with no matching keystrokes).

**This repo is Component 1 — Telemetry Infrastructure only:** browser capture → clock sync → WebSocket ingest → TimescaleDB → windowed feature vectors, plus synthetic data generation and the data-loss / reliability-boundary experiments.

The classifier, adaptive question generation, and explainability layer are **out of scope**. Represent them as interfaces only: a mock classifier that returns a confidence, and a no-op question-generation trigger.

> **Component numbering conflicts between the two docs.** The brief calls the classifier "Component 2" and question generation "Component 3". The TAF's task lists call the classifier "C3". Ask which numbering to use before naming modules or writing prose that references components by number.

## Intended stack

React + TypeScript + Monaco (Vite) frontend · FastAPI + `asyncpg` backend · PostgreSQL + TimescaleDB · `pandera` for the feature contract · NumPy/Pandas for synthetic generation and degradation. Python 3.11+, Node 20+, `docker-compose.yml` for TimescaleDB.

Locally available: Python 3.12, Node 22, npm 10, Docker with Compose v5. **`uv` is not installed** — use `pip` unless you install it first.

## Architecture decisions that span multiple files

These are the non-obvious constraints. Violating any of them silently breaks the pipeline.

**One unified `events` hypertable, discriminated by a `kind` column.** Keystrokes and edits do *not* get separate tables. The reason is downstream: a TimescaleDB continuous aggregate can only read a single hypertable, and windowing needs both streams in one bucket.

**Two timestamps per event, never collapsed into one.** `perf_now` is the raw monotonic `performance.now()` value stamped in the browser at capture. `time` is the server-aligned wall clock derived from it via the clock-sync offset, and is the hypertable partition/query column. Both are stored because the data-loss simulation perturbs `perf_now` to model clock drift — collapsing them destroys the core research capability.

**Feature computation is deliberately split across three layers.** Know which layer a feature belongs to before adding it:

| Layer | Computes | Why it must live there |
|---|---|---|
| Continuous aggregate `win_1s` (SQL) | Pure within-bucket aggregates: counts, `paste_ratio`, `backspace_ratio`, `max(gap_ms)`, `max(inserted_len)` | Cheap, incrementally materialized |
| Plain view `win_1s_context` (SQL) | Cross-window context: `lag()`, trends, rolling averages | TimescaleDB **forbids window functions inside continuous aggregates** because they cross bucket boundaries |
| Python extractor in `shared_features/` | Keystroke timing pairs: `mean_dwell_ms`, `std_dwell_ms`, `mean_flight_ms`, `std_flight_ms` | Requires pairing keydown↔keyup and consecutive keystrokes, not expressible as a bucket aggregate |

**Every context/window function must be `PARTITION BY session_id`.** A `lag()` or rolling average that crosses a session boundary silently fabricates features from another candidate's data.

**`shared_features/` is the single source of truth for the C1↔C2 boundary.** The `pandera` `DataFrameSchema` in `feature_schema.py` is authoritative for every feature's name, dtype, unit, and range. Ingest, the synthetic generator, and the downstream classifier all import it. Crucially, **the synthetic generator emits raw events and runs them through the same extractor as real telemetry** — that is what makes synthetic and real feature vectors match by construction. Never add a parallel feature path. If a feature changes, change it in the schema first and let CI fail loudly on drift.

**Monaco's auto-insertion must be disabled, identically everywhere.** Characters that appear without a physical keystroke corrupt the keydown→edit mapping. The exact option set lives in `editorOptions.ts` (see brief §5.1: suggestions, auto-closing brackets/quotes, auto-indent, format-on-type/paste, drag-and-drop, multi-cursor, all off; `tabSize`/`wordWrap`/font size pinned to constants). The config used to collect training data must equal the config used at inference — a mismatch shifts feature distributions and breaks the classifier.

**Environment events are recorded, never blocked.** `blur`/`focus`, `visibilitychange`, `fullscreenchange`, `resize` are captured as signals (a blur followed by a large paste is strong evidence of `external_ai`). **Do not attempt OS-level lockdown** — a browser tab cannot prevent alt-tab, a second monitor, or screenshots. Only in-page controls (full-screen request, in-page paste handling, disabling Monaco auto-insertion) are enforceable, and proposing anything more is an explicit non-goal.

**Clock sync is NTP-style over the same WebSocket as the event stream.** Client sends `t0`, server records `t1`/`t2`, client records `t3`; `offset = ((t1 - t0) + (t2 - t3)) / 2`. Send repeated pings and keep the **median offset from low-RTT samples only**. Every sample (accepted or not) is persisted to `clock_sync_samples`.

**Batching does not distort timing.** Events are buffered client-side and flushed every ~250 ms or every N events. This is safe *because* timestamps are frozen at capture — preserve that property in any transport change.

**Privacy: hash `key_char` before storing.** Never persist raw pasted text content beyond `inserted_len` unless a labelled experiment explicitly requires it.

**Window size is a hyperparameter, not a constant.** 1 s is the starting base bucket. The accuracy-vs-privacy experiment sweeps 100 ms / 1 s / 10 s and resolves it empirically. Measure pauses as inter-event `gap_ms` (precomputed at ingest), *not* as bucket contents, so pause features stay window-size-independent.

## Research deliverables (the novelty — not incidental tooling)

Three experiments are the point of the component, not add-ons:

1. **Data-loss simulation** (`simulation/degrade.py`) — degrade a clean stored session with **isolated** failure modes at controlled severities: random event drops, timestamp jitter, clock drift. Isolation is the contribution; do not bundle failure modes.
2. **Reliability boundary** (`simulation/reliability_boundary.py`) — feed each degraded copy through a **fixed, unmodified** classifier and record how confidence shifts as a function of degradation severity alone, then report the severity at which output stops being trustworthy.
3. **Accuracy vs. privacy trade-off** — at each window size, measure detection quality against re-identification risk (cosine similarity / nearest-neighbour distance over per-candidate feature vectors). Each window size is one point on the curve.

## Build order

Brief §9 gives the intended sequence: scaffold → `docker-compose.yml` + `.env.example` → migrations `001..006` + runner → `shared_features/` → FastAPI ingest + clock sync → frontend capture → synthetic generators → simulation → tests. Later steps depend on the contract established in `shared_features/`, so do not reorder past it.

Target layout is in brief §8.
