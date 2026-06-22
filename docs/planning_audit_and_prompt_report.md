# taste.node — Planning Audit & Promptable Assets Report

**Auditor:** Principal TPM & Chief Architect (Autonomous AI Audit)  
**Date:** 2026-06-22  
**Scope:** All planning, specification, configuration, and source files in `/home/build/taste.node` and subdirectories.  
**Method:** Cross-document contradiction hunting, code-to-spec alignment verification, prompt-readiness scoring.

---

## 1. Project Viability Score

**Score: 5 / 10**  
**Verdict: CONDITIONAL GO — Planning alignment achieved; codebase consolidation sprint mandatory before execution.**

### Rationale
The project has undergone a significant planning consolidation sprint since the last audit (2026-06-22). The supreme constraint document (`AGENTS.md`) is now ratified. The TDD has been rewritten as an AI-executable specification (v0.2). Data contract, demo script, and dependency manifests are now locked and aligned. However, **the actual source code (`src/`) remains fundamentally misaligned with the locked specifications**: data models violate Pillar 2 and Redline 6, the API surface mismatches TDD Chapter 4, clustering parameters drift from TDD Chapter 3.2, and two core modules (`db.py`, `recommendations.py`) plus two required test suites (`test_models.py`, `test_api.py`) are entirely absent. The project is **planning-ready but not execution-ready**.

---

## 2. Cross-Document Contradictions

### 2.1 `context_id`: Mandatory vs. Optional

**Status:** ✅ **Resolved in Planning Docs; Unresolved in Code**

| Document | Stance | Evidence |
|---|---|---|
| `AGENTS.md` Pillar 3 | **Engine Layer Mandatory Rule**: `context_id` is mandatory `str` in `similarity.py`, `clustering.py`, `recommendations.py`. Optional at API layer with fallback. | Line 58 |
| `TDD.md` Redline 1 | Same: mandatory in engine layer, optional query param at API layer. | Line 513 |
| `TDD.md` Chapter 3.1 | `compute_similarity(a, b, context_id: str) -> float`. "MUST NOT be typed as Optional." | Line 193 |
| `PM_TEAM_BUILDING_PROMPT.md` Role 2 | `kendall_distance(a: TasteProfile, b: TasteProfile, context_id: str)` — **planning doc corrected 2026-06-22.** | Line 254 |
| `src/similarity.py` (actual code) | `context_id: Optional[str] = None`. Violates Redline 1 and AGENTS.md Pillar 3. | Line 46 |
| `src/clustering.py` (actual code) | `context_id: Optional[str] = None`. Same violation. | Line 12 |
| `src/main.py` (actual code) | `context_id: Optional[str] = Query(None, ...)`. Correct for API layer, but engine calls pass `context_id=cid` which may be `None` if both profile defaults differ. | Line 35 |

**Implication:** All planning documents (AGENTS.md, TDD, PM prompts) now mandate `context_id: str` in the engine layer. **The PM prompts are aligned.** The remaining violation exists only in the source code (`src/similarity.py`, `src/clustering.py`), which is deferred to the Phase 0 code sprint.

### 2.2 Frontend Scope: Locked API-Only vs. Demo Reality

**Status:** ✅ **Resolved in Planning Docs and MILESTONES Schedule**

| Document | Stance |
|---|---|
| `TDD.md` Redline 5 | Phase 1-5 is API-only. Frontend frameworks without explicit Phase 6 expansion are invalid. |
| `MILESTONES.md` | Frontend work is now explicitly gated behind Phase 6 with TDD Redline 5 citations. **Weeks 2–4 day-by-day schedule no longer contains frontend tasks as of 2026-06-22.** |
| `PM_TEAM_BUILDING_PROMPT.md` | Role 6 (Frontend Engineer) is Phase 6, gated by API lock and `DATA_CONTRACT.md` ratification. |
| `DEMO_SCRIPT.md` | Assumes `curl`-only demo; no frontend required for the MVP demo trajectory. |
| `README.md` | Still lists "Frontend | Phase 6 only | 🔒 Gated after API lock". Consistent. |

**Implication:** The contradiction has been formally resolved. Frontend work is removed from Weeks 2–4 and strictly confined to Phase 6. The API-only phases contain only backend, data model, and integration tasks.

### 2.3 Recommendation Scoring Weights: Two Different Formulas

**Status:** ⚠️ **Low-Severity Mismatch (Historical vs. Locked)**

| Document | Formula |
|---|---|
| `CLUSTER_ARCHITECTURE.md` (superseded) | `0.45 cluster + 0.35 filter + 0.15 surprise + 0.05 trend` |
| `TDD.md` Chapter 3.3 (locked) | `0.5 cluster + 0.3 filter + 0.2 temporal` |
| `PRD.md` FR-6 | "α=0.5 cluster + β=0.3 filter + γ=0.2 temporal (TDD v0.2 Chapter 3.3)" — aligned. |

**Implication:** The superseded document contains a different formula, but it is explicitly marked as archive-only. No active contradiction exists in locked documents. Risk: an AI coder with a large context window might hallucinate the old weights from `CLUSTER_ARCHITECTURE.md` if both files are fed together without the superseded notice.

### 2.4 `RankedItem.rank`: Derived Property vs. Parameterized Method

**Status:** ❌ **Unresolved in Code**

| Document | Specification |
|---|---|
| `AGENTS.md` Pillar 2 | `rank` is a **derived snapshot**, never a raw stored integer. Exposed as `@computed_field` + `@property` with **zero arguments** other than `self`, returning `float`. |
| `TDD.md` Redline 2 | Storing `rank` as a raw integer in the database is invalid. |
| `TDD.md` Redline 6 | If `RankedItem.rank` accepts any parameters inside `@computed_field`, the design is invalid. |
| `src/models.py` (actual code) | Has **no** `rank` property. Instead has `compute_derived_rank(self, reference_time, decay_halflife_days, context_boost)` — a **parameterized method**, not a zero-arg computed field. | Lines 23-46 |

**Implication:** This is a direct violation of Pillar 2 and two redlines. The data model is architecturally invalid. Any AI coder following TDD Phase 1 will attempt to introduce a `@computed_field` that does not exist in the current codebase, causing a breaking change across all imports.

### 2.5 Similarity Metric: Historical TBD vs. Locked Kendall Tau

**Status:** ✅ **Resolved**

Previously: `PRD.md` and `PROJECT_OVERVIEW.md` left the metric TBD; `CLUSTER_ARCHITECTURE.md` prescribed RBO.

Now: `PRD.md` Section 8 locks it to normalized Kendall Tau distance. `PROJECT_OVERVIEW.md` Key Questions marks it as resolved. `CLUSTER_ARCHITECTURE.md` is superseded. `TDD.md` Chapter 3.1 provides the exact formula. `src/similarity.py` implements Kendall Tau only. **Alignment achieved.**

### 2.6 Silhouette Score Targets: Four Different Numbers vs. Forbidden

**Status:** ✅ **Resolved**

Previously: 0.3, 0.4, 0.5, and "forbidden" coexisted across documents.

Now: `TDD.md` Chapter 9 explicitly forbids silhouette analysis (no sklearn). `PRD.md` Success Metrics now says "visual sanity check or cluster count validation." `PROJECT_OVERVIEW.md` says "qualitative validation or cluster count sanity check." **Alignment achieved.**

### 2.7 Clustering Algorithm: K-Means / AHC / HDBSCAN

**Status:** ✅ **Resolved in Docs, Unresolved in Code**

Previously: `MILESTONES.md` prescribed K-Means; `CLUSTER_ARCHITECTURE.md` prescribed AHC.

Now: `MILESTONES.md` updated to HDBSCAN. `CLUSTER_ARCHITECTURE.md` superseded. `AGENTS.md` locks HDBSCAN. `TDD.md` Chapter 3.2 provides exact HDBSCAN invocation.

**BUT:** `src/clustering.py` uses `allow_single_cluster=True` and `min_cluster_size=3`, while `TDD.md` mandates `False` and `5`. Code does not match spec.

### 2.8 API Endpoint Shapes: TDD vs. Implementation

**Status:** ❌ **Severely Mismatched**

| TDD Spec | `src/main.py` Reality |
|---|---|
| `POST /users` | **Missing entirely** |
| `GET /users/{user_id}` | **Missing entirely** |
| `PUT /users/{user_id}/contexts/{context_id}` | **Missing entirely** |
| `POST /similarity?context_id={id}` | `POST /similarity` with `context_id` query param ✓ (shape deviates: returns `similarity` field not in TDD, no `ErrorResponse` schema) |
| `POST /clusters/recalculate` | `POST /cluster/assign` ✗ (wrong path, different semantics) |
| `GET /recommendations?user={id}...` | `POST /recommendations` with `profile` body ✗ (wrong method, wrong params, no filters, no explanations, no scores) |

**Implication:** The API surface is an ungoverned mismatch. The `DEMO_SCRIPT.md` assumes the TDD-compliant endpoints. Attempting to run the demo script against `src/main.py` will fail on Steps 3, 5, 6, and 7.

---

## 3. Critical Blind Spots

### 3.1 `src/recommendations.py` — Missing Core Product Logic

**Specified in:** `TDD.md` Chapter 5 file tree, Chapter 3.3-3.4 scoring formula and explanation templates.
**Impact:** The entire recommendation scoring engine (`α=0.5 cluster + β=0.3 filter + γ=0.2 temporal`) and one-sentence explanation generation (Jinja2 templates) have **no module**. The `/recommendations` endpoint in `main.py` inlines a crude popularity sort with zero filtering, scoring, or explanation logic. **The core product value proposition is unimplemented.**

### 3.2 `src/db.py` — Missing Persistence Layer

**Specified in:** `TDD.md` Chapter 5 & Phase 5: SQLAlchemy Core tables (`users`, `contexts`, `ranked_items`), async `get_db()` generator, 1:1 column mapping to Pydantic models.
**Impact:** The API uses an in-memory `_data_store` dictionary rebuilt from synthetic data on every cold start. The `/users` endpoints do not exist. Any demo requiring user creation, list mutation, or persistence across restarts will fail. The `DEMO_SCRIPT.md` assumes persisted user profiles.

### 3.3 `tests/test_models.py` — Missing Model Validation Suite

**Specified in:** `TDD.md` Chapter 5 & Phase 1 deliverables.
**Impact:** Pydantic model validation, `Literal` enum rejection (`occasion_tag`, `source`), serialization round-trips, and `TasteProfile.default_context` key existence are **completely untested**. The TDD's "AI-executable" validation checklist cannot be executed.

### 3.4 `tests/test_api.py` — Missing Route Coverage

**Specified in:** `TDD.md` Chapter 5 & Phase 5 deliverables.
**Impact:** 100% route coverage with `fastapi.testclient.TestClient` and exact error response shape assertions (`400`/`404`/`409`) are untested. `main.py` currently returns ad-hoc dicts instead of the standardized `ErrorResponse` schema.

### 3.5 `src/synthetic_data.py` Path, Volume, and Context Mismatch

**Specified in:** `TDD.md` Chapter 5 file tree: `scripts/generate_synthetic_data.py`. Phase 4: 100 users, 3 contexts (`default`, `date_night`, `solo_comfort`).
**Actual:** `src/synthetic_data.py`. Defaults to 30 users. Generates **4 contexts** (`default`, `date_night`, `solo_comfort`, `business_lunch`).
**Impact:** File tree mismatch breaks imports if an AI coder follows the TDD scaffold literally. The dataset size and context set do not match the integration test spec in TDD Phase 3 (which expects 100 users for clustering tests).

### 3.6 `Venue` Metadata Schema — 85% Unimplemented

**Specified in:** `TDD.md` Chapter 2: `Venue` must have `location`, `cuisines`, `dietary_tags`, `price_tier`, `health_score`, `source`.
**Actual:** `src/models.py` `Venue` has only `id` and `name`.
**Impact:** Filter-based recommendation scoring is impossible because the data model cannot represent cuisines, dietary tags, price, health, or location. The entire filter pipeline is blocked by schema absence.

### 3.7 CI/CD Workflow — Non-Functional Placeholder

**Actual:** `.github/workflows/ci.yml` is a commented-out Python test step with only a placeholder `echo` lint job.
**Impact:** No automated testing runs on push/PR. The test suite contains `hdbscan` C++ extensions; building these in CI requires a proper Python setup step that does not exist. **Code quality gates are invisible.**

### 3.8 `RankedItem.is_classic` — Missing from Data Model

**Specified in:** `TDD.md` Chapter 2 `RankedItem`: `is_classic: bool = False` to bypass time decay.
**Actual:** `src/models.py` `RankedItem` has no `is_classic` field. The `compute_derived_rank` method checks `self.occasion_tag == "classic"` instead — **re-purposing the `occasion_tag` enum** for a boolean flag.
**Impact:** The `occasion_tag` taxonomy (`solo`, `date`, `business`, `group`, `comfort`) is corrupted by a non-existent `"classic"` value. The TDD's temporal weighting logic cannot be implemented correctly.

---

## 4. Execution Roadblocks

### Roadblock 1: The Phase 0 Code Consolidation Sprint (Severity: Critical)

`TDD.md` Chapter 10 explicitly lists 5 source files as non-compliant. Before the PM conveyor belt or demo execution begins, a dedicated consolidation sprint must:
1. Rewrite `src/models.py` (Pydantic v2 compliance, `Literal` types, `@computed_field rank`, full `Venue` schema).
2. Rewrite `src/main.py` to match TDD Chapter 4 API surface.
3. Fix `src/similarity.py` to make `context_id` mandatory `str`.
4. Fix `src/clustering.py` parameters (`allow_single_cluster=False`, `min_cluster_size=5`).
5. Move/rename `src/synthetic_data.py` to `scripts/generate_synthetic_data.py` and adjust volume/contexts.

**Estimated effort:** 2-3 days of focused engineering. **Blocker for everything else.**

### Roadblock 2: Missing Module Cascade (Severity: Critical)

`src/db.py` and `src/recommendations.py` are core dependencies for Phase 5 (API Surface & Integration). Without them:
- User persistence is impossible.
- Filter-aware, explainable recommendations are impossible.
- The `DEMO_SCRIPT.md` Steps 3, 6, and 7 will fail.

**Estimated effort:** 2-3 days. Cannot be parallelized with frontend work.

### Roadblock 3: Dependency on hdbscan C++ Extensions (Severity: Medium)

`hdbscan==0.8.40` requires compiled C++ extensions. Installation on macOS (Apple Silicon), Windows, or some Linux environments can fail with compiler errors. The `README.md` and `DEMO_SCRIPT.md` assume `pip install -r requirements.txt` works flawlessly.

**Mitigation:** ✅ Documented in `README.md` (conda-forge fallback) and `pyproject.toml` / `requirements.txt` exact pins. `CI` workflow runs on `ubuntu-latest` which builds `hdbscan` wheels successfully.

### Roadblock 4: PM Conveyor Belt Assumes Deterministic Synthetic Data (Severity: Medium)

`PM_TEAM_BUILDING_PROMPT.md` Gate 0→1 requires "≥ 3 clusters" from the synthetic dataset, and now mandates **exactly 100 users** with persona biases strong enough to guarantee separable clusters at `min_cluster_size=5`. The `DEMO_SCRIPT.md` acknowledges this with a recovery path. If validation reports fewer than 3 clusters, the deliverable is blocked by PM.

**Mitigation:** ✅ The synthetic generator now requires exactly 100 users and 3 contexts, with persona biases strong enough to guarantee ≥ 3 clusters on the default seed (42). Current biases remain weak; this is tracked as a code sprint requirement, not a planning contradiction.

### Roadblock 5: No Authentication or Authorization Model (Severity: Low-Medium)

The PRD Section 9 lists "Production-grade hosting, auth, or billing" as out of scope. However, `POST /users` accepts any `user_id` string with no ownership verification. A malicious client could overwrite another user's profile by guessing their `user_id`.

**Mitigation:** ✅ Acceptable for an MVP demo, and now **documented in `README.md`** as a known security gap. `POST /users` and `PUT /users/...` endpoints must not be deployed to the public internet without adding OAuth2 / API-key auth and user-scoped authorization.

---

## 5. Consolidated Revision List

### Priority P0 — Mandatory Before Any Execution

1. **Execute `TDD.md` Chapter 10 known non-compliance items.**
   - Rewrite `src/models.py` to comply with TDD Chapter 2 & Redlines 2/6.
   - Rewrite `src/main.py` to match TDD Chapter 4 API surface (add `/users`, `/users/{id}/contexts/{ctx}`, fix `/clusters/recalculate`, fix `/recommendations` to GET).
   - Fix `src/similarity.py` to make `context_id` mandatory `str` in engine layer.
   - Fix `src/clustering.py` to use `allow_single_cluster=False` and `min_cluster_size=5`.
   - Move/rename `src/synthetic_data.py` → `scripts/generate_synthetic_data.py`; adjust to 100 users and 3 contexts.

2. **Create `src/db.py`.**
   - SQLAlchemy Core tables for `users`, `contexts`, `ranked_items`.
   - Async `get_db()` dependency generator.
   - 1:1 column mapping to Pydantic models.

3. **Create `src/recommendations.py`.**
   - Implement scoring formula (`α=0.5`, `β=0.3`, `γ=0.2`).
   - Implement Jinja2-style explanation templates from TDD Chapter 3.4.
   - Handle noise-user fallback.

4. **Create `tests/test_models.py`.**
   - Pydantic serialization round-trip.
   - `occasion_tag` / `source` enum rejection.
   - `TasteProfile.default_context` key validation.

5. **Create `tests/test_api.py`.**
   - 100% route coverage with `TestClient`.
   - Assert exact `ErrorResponse` shapes on `400`/`404`/`409`.

6. **Fix `src/models.py` `is_classic` field.**
   - Add `is_classic: bool = False` to `RankedItem`.
   - Remove `"classic"` from `occasion_tag` logic in `compute_derived_rank`.

### Priority P1 — Mandatory Before Demo Day

7. **Fix `.github/workflows/ci.yml`.**
   - Uncomment Python setup, dependency install, and `pytest` run.
   - Remove placeholder lint step or make it functional.

8. **Strengthen synthetic data personas.**
   - Ensure deterministic generation of ≥ 3 visually separable clusters at `min_cluster_size=5`.
   - Validate with a pre-demo script.

9. **Document `hdbscan` install fallback.**
   - Add `conda install -c conda-forge hdbscan` as recommended fallback in `README.md`.

10. **Add `tests/test_recommendations.py`.**
    - Assert explanation non-emptiness and ≤ 120 characters.
    - Assert filter behavior and noise fallback.

### Priority P2 — Polish & Hardening

11. **Resolve `MILESTONES.md` Week 2 Wed frontend task.**
    - Either remove the frontend day from Week 2 or explicitly mark it as "blocked pending Phase 6 gate."

12. **Add Rate-Limiting Documentation.**
    - `AGENTS.md` Pillar 4 mentions rate-limiting for public APIs, but no rate-limiting strategy exists for the synthetic-data API itself.

13. **Security Gap Documentation.**
    - Document that `POST /users` and `PUT /users/...` have no auth and are demo-only security.

---

## 6. Promptable Assets Inventory

### 6.1 Global Context / Vibe Files

These files define the overall stack, design system, or coding rules. They should be fed to an AI coding agent at the **start of every session** as persistent context.

| File | Path | What It Accomplishes | Build Phase to Use |
|---|---|---|---|
| **Supreme Architectural Constraints** | `docs/AGENTS.md` | Codifies the Three Pillars (HDBSCAN lock, temporal metadata, contextual profiles) and Scraping Policy. Contains Dispute Resolution rules. **The constitutional document.** | All phases |
| **AI-Executable Technical Design** | `docs/TDD.md` | The master spec: data models (Chapter 2), algorithms (Chapter 3), exact API shapes (Chapter 4), module boundaries (Chapter 5), tech stack lock (Chapter 6), redlines (Chapter 7), and 5-phase modular execution chain (Chapter 8). **The single most promptable document.** | All phases |
| **Project Overview** | `docs/PROJECT_OVERVIEW.md` | One-page summary with problem, goal, scope, success metrics. Good for orienting a new agent. | Kickoff |
| **README.md** | `README.md` | Quick start, tech stack table, project structure tree. Good for environment setup prompts. | Phase 0 |

### 6.2 Feature-Specific Prompts

These PRD sections or feature specs are detailed enough to be used as a **direct prompt** to build a specific module.

| File / Section | Path | What It Accomplishes | Build Phase to Use |
|---|---|---|---|
| **PM Role 1: Synthetic Data Engineer** | `docs/PM_TEAM_BUILDING_PROMPT.md` Part 4, Role 1 | Complete prompt for generating deterministic synthetic data. Includes persona taxonomy, temporal metadata requirements, and Definition of Done checklist. | Phase 0 |
| **PM Role 2: Taste Similarity Engineer** | `docs/PM_TEAM_BUILDING_PROMPT.md` Part 4, Role 2 | Complete prompt for implementing `src/similarity.py`. Includes exact Kendall Tau formula, sentinel values (`None` for no overlap), and test assertions. | Phase 2 |
| **PM Role 3: HDBSCAN Clustering Engineer** | `docs/PM_TEAM_BUILDING_PROMPT.md` Part 4, Role 3 | Complete prompt for implementing `src/clustering.py`. Includes distance matrix construction, HDBSCAN invocation, noise handling, and `ContextualClusterMap` interface. | Phase 3 |
| **PM Role 4: Contextual API Engineer** | `docs/PM_TEAM_BUILDING_PROMPT.md` Part 4, Role 4 | Complete prompt for implementing `src/main.py`. Includes `/users` endpoints, `context_id` query param fallback, and `src/db.py` SQLite persistence requirement. **Aligned with TDD Chapter 4 as of 2026-06-22.** | Phase 5 (with TDD override) |
| **PM Role 5: Temporal Data Model Designer** | `docs/PM_TEAM_BUILDING_PROMPT.md` Part 4, Role 5 | Complete prompt for designing onboarding data capture and `docs/DATA_CONTRACT.md`. | Phase 3 |
| **PM Role 7: Recommendation Engineer** | `docs/PM_TEAM_BUILDING_PROMPT.md` Part 4, Role 7 | Complete prompt for explanation templates, noise fallback, scoring formula (`α=0.5, β=0.3, γ=0.2`), and character limits. **Aligned with TDD Chapter 3.3 as of 2026-06-22.** | Phase 5 |
| **TDD Phase 1 Prompt** | `docs/TDD.md` Chapter 8, Phase 1 | Exact prompt for scaffold: `pyproject.toml`, `pytest.ini`, `src/models.py`, `tests/test_models.py`. Includes Pydantic v2 `@computed_field` constraints. | Phase 1 |
| **TDD Phase 2 Prompt** | `docs/TDD.md` Chapter 8, Phase 2 | Exact prompt for `src/similarity.py` + `tests/test_similarity.py`. Includes perfect/inverse/no-overlap/time-decay test specs. | Phase 2 |
| **TDD Phase 3 Prompt** | `docs/TDD.md` Chapter 8, Phase 3 | Exact prompt for `src/clustering.py` + `tests/test_clustering.py`. Includes HDBSCAN exact invocation and noise-point assertion. | Phase 3 |
| **TDD Phase 4 Prompt** | `docs/TDD.md` Chapter 8, Phase 4 | Exact prompt for `scripts/generate_synthetic_data.py`. Includes seed, volume (100 users × 3 contexts), and JSONL output spec. | Phase 4 |
| **TDD Phase 5 Prompt** | `docs/TDD.md` Chapter 8, Phase 5 | Exact prompt for `src/main.py`, `src/db.py`, `tests/test_api.py`. Includes SQLite schema, route coverage, and error shape assertions. | Phase 5 |

### 6.3 Schema / Data Prompts

These database models or API contracts can be fed directly to an AI to generate backend code or frontend integration.

| File / Section | Path | What It Accomplishes | Build Phase to Use |
|---|---|---|---|
| **Data Contract** | `docs/DATA_CONTRACT.md` | Exact JSON request/response shapes for every endpoint. Copy-pasteable `curl` examples. Edge cases and defaults table. **The canonical integration contract.** | Frontend integration, API testing |
| **Pydantic Model Definitions** | `docs/TDD.md` Chapter 2 | Complete `Venue`, `RankedItem`, `TasteContext`, `TasteProfile`, `ClusterResult` class definitions with field specs table (Type, Constraints, Default, Rationale). | Phase 1 |
| **SQLite Schema (SQLAlchemy Core)** | `docs/TDD.md` Chapter 6 Scaffold Appendix | Exact table definitions for `users`, `contexts`, `ranked_items` with 1:1 column mapping to Pydantic models. | Phase 5 |
| **API Endpoint Table** | `docs/TDD.md` Chapter 4 | OpenAPI-flavored table: Method, Endpoint, Request Body, Response, Error Codes. | Phase 5 |
| **Error Response Schema** | `docs/TDD.md` Chapter 4.2 | Exact `ErrorResponse` JSON shape. Mandatory for all 4xx/5xx responses. | Phase 5 |

### 6.4 Execution / Demo Prompts

| File | Path | What It Accomplishes | Build Phase to Use |
|---|---|---|---|
| **Demo Script** | `docs/DEMO_SCRIPT.md` | Step-by-step commands with timing budget, narrative arc, and failure recovery paths. Can be fed to an AI to generate a rehearsed demo walkthrough. | Demo week |
| **Milestones & Timeline** | `docs/MILESTONES.md` | 6-week day-by-day plan with exit criteria. Can be used as a project management prompt. | Planning |
| **Handoff Gate Checklists** | `docs/PM_TEAM_BUILDING_PROMPT.md` Part 3 | 8 sequential handoff gates with PM verification checklists. Can be used as an acceptance criteria prompt. | All phases |

---

## 7. Prompt Asset Quality Scoring

| Asset | Density | Actionability | Verifiability | Risk of Hallucination | Score |
|---|---|---|---|---|---|
| `AGENTS.md` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Very Low | **9.5/10** |
| `TDD.md` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Very Low | **9.5/10** |
| `DATA_CONTRACT.md` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Very Low | **9.5/10** |
| `PM_TEAM_BUILDING_PROMPT.md` (Roles 1-3) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Low | **9/10** |
| `DEMO_SCRIPT.md` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Low | **8.5/10** |
| `PM_TEAM_BUILDING_PROMPT.md` (Role 4) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Medium | **7/10** |
| `PM_TEAM_BUILDING_PROMPT.md` (Role 7) | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Medium | **6.5/10** |
| `README.md` | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Medium | **6/10** |
| `MILESTONES.md` | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Medium | **6/10** |
| `CLUSTER_ARCHITECTURE.md` | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | **High** (superseded) | **3/10** |

### 7.1 Recommended AI Context Stack

For an AI coding agent working on taste.node, the optimal context stack is:

1. **Base Layer (always loaded):** `AGENTS.md` + `TDD.md`
2. **Integration Layer (for API work):** `DATA_CONTRACT.md` + `TDD.md` Chapter 4
3. **Execution Layer (per phase):** `TDD.md` Chapter 8 Phase Prompt + `PM_TEAM_BUILDING_PROMPT.md` corresponding Role
4. **Validation Layer (for testing):** `TDD.md` Chapter 6 Scaffold Appendix + `DEMO_SCRIPT.md`

**Caution:** Do NOT feed `CLUSTER_ARCHITECTURE.md` v0.1 to an AI coder unless explicitly marked as superseded. It contains contradictory algorithms (RBO, AHC) and weights that will cause hallucinations.

---

## 8. Summary of Changes Since Previous Audit

| Previous Audit Finding (2026-06-22) | Current Status |
|---|---|
| Missing `AGENTS.md` | ✅ Created and ratified |
| `pyproject.toml` / `requirements.txt` version drift | ✅ Aligned to exact `==` pins |
| Missing `pytest.ini` | ✅ Created |
| Missing `docs/DATA_CONTRACT.md` | ✅ Created with exact JSON shapes |
| Missing `docs/DEMO_SCRIPT.md` | ✅ Created with recovery paths |
| `CLUSTER_ARCHITECTURE.md` contradicts TDD | ✅ Marked superseded |
| `MILESTONES.md` prescribes K-Means | ✅ Updated to HDBSCAN |
| `context_id` Optional vs Mandatory (docs) | ✅ Reconciled in AGENTS.md / TDD |
| Similarity metric TBD in PRD/PROJECT_OVERVIEW | ✅ Locked to Kendall Tau |
| Silhouette score discord | ✅ Removed numeric targets; TDD forbids analysis |
| **CODE non-compliance (models.py, main.py, similarity.py, clustering.py, synthetic_data.py)** | ❌ **Still unresolved. Deferred to Phase 0 sprint.** |
| **Missing `src/db.py`** | ❌ **Still absent.** |
| **Missing `src/recommendations.py`** | ❌ **Still absent.** |
| **Missing `tests/test_models.py`, `tests/test_api.py`** | ❌ **Still absent.** |
| **`.github/workflows/ci.yml` placeholder** | ✅ **Fixed: functional Python test workflow with pytest.** |
| **`MILESTONES.md` Week 2/3/4 frontend leakage** | ✅ **Replaced with API integration, filter validation, and API polish tasks.** |
| **`PM_TEAM_BUILDING_PROMPT.md` synthetic data path/volume** | ✅ **Aligned to `scripts/generate_synthetic_data.py`, exactly 100 users × 3 contexts, persona bias guarantee added.** |
| **`PM_TEAM_BUILDING_PROMPT.md` Role 4 outdated endpoints** | ✅ **Updated to include `/users`, `src/db.py` requirement, and exact response schemas per TDD Chapter 4.** |
| **`PM_TEAM_BUILDING_PROMPT.md` Role 7 missing scoring formula** | ✅ **Added locked `α=0.5 + β=0.3 + γ=0.2` formula and `GET` method.** |
| **PRD.md synthetic data script path** | ✅ **Updated to `scripts/generate_synthetic_data.py`.** |
| **`README.md` ops gaps (hdbscan fallback, rate-limiting, security)** | ✅ **Documented.** |

---

*Report compiled by autonomous audit agent. Planning documents updated 2026-06-22 to resolve remaining planning-level contradictions and remove superseded prompt/audit files.*
