# taste.node — Planning Audit Report

**Auditor:** Principal TPM & Chief Architect (Autonomous AI Audit)  
**Date:** 2026-06-22  
**Scope:** All planning, specification, configuration, and source files in `/home/build/taste.node` and subdirectories.  
**Documents Audited:**
- `docs/PRD.md` (v0.1, 2026-06-19)
- `docs/PROJECT_OVERVIEW.md` (2026-06-19)
- `docs/CLUSTER_ARCHITECTURE.md` (v0.1, 2026-06-20)
- `docs/TDD.md` (v0.2 — AI-Executable Rewrite, 2026-06-22)
- `docs/TDD_REWRITE_PROMPT.md` (Meta-spec for TDD.md rewrite)
- `docs/PM_TEAM_BUILDING_PROMPT.md` (Role pipeline & handoff guide)
- `docs/MILESTONES.md` (2026-06-19)
- `README.md`
- `SYSTEM_PROMPT.md` (Three Pillars + Scraping Policy)
- `pyproject.toml`
- `requirements.txt`
- `.github/workflows/ci.yml`
- `src/main.py`, `src/models.py`, `src/similarity.py`, `src/clustering.py`, `src/synthetic_data.py`
- `tests/test_similarity.py`, `tests/test_clustering.py`, `tests/test_synthetic_data.py`

---

## 1. Project Viability Score

**Score: 3 / 10**  
**Verdict: NO-GO for demo execution.**

The project suffers from a triad of fatal conditions: (1) a **supreme constraint document (`AGENTS.md`) is entirely missing** despite being cited as immutable law across the TDD, rewrite prompt, and system prompt; (2) **sharp contradictions between the locked TDD and the actual running code** on clustering parameters, API shapes, data models, and the `context_id` contract; and (3) **systematic absence of Phase 2–5 deliverables** (persistence layer, API compliance, frontend, explanations). The codebase currently implements roughly 20% of the specification. Any attempt to run the PM conveyor belt or demo the product will hit architectural guardrails that the code violates. The project is **not execution-ready** without a consolidation sprint to reconcile TDD v0.2 against reality, backfill `AGENTS.md`, and rewrite `models.py` and `main.py` to comply with Redlines 1–6.

---

## 2. Cross-Document Contradictions

### 2.1 Clustering Algorithm: Three Different Algorithms Across Four Documents

- **`docs/MILESTONES.md`**, Week 2 (Tue): Explicitly directs the team to "Implement seed data ingestion + initial **K-Means clustering**" (line 51).  
- **`docs/CLUSTER_ARCHITECTURE.md`**, Section 2.1: Specifies **Agglomerative Hierarchical Clustering (AHC)** with `average` linkage, and mentions Spectral Clustering as an alternative (lines 167–206). HDBSCAN is never mentioned.  
- **`docs/TDD.md`**, Chapter 3.2 & Redline 3: Mandates **HDBSCAN** exclusively (`metric='precomputed'`, `min_cluster_size=5`, `allow_single_cluster=False`). Forbids K-Means and any algorithm assuming Euclidean/Gaussian geometry.  
- **`src/clustering.py`**: Implements **HDBSCAN** (correct per TDD), but uses `allow_single_cluster=True` (line 57) and default `min_cluster_size=3` (line 35), both violating TDD.md.  
- **Implication:** A developer reading MILESTONES will build K-Means, violating TDD Redline 3. A developer reading CLUSTER_ARCHITECTURE will build AHC, also violating Redline 3. The TDD's claim that the design is "locked" is undermined by its own milestones document.

### 2.2 Similarity Metric: RBO vs. Kendall Tau vs. Hybrid vs. TBD

- **`docs/PRD.md`**, Section 8 (Open Questions, line 112): "Which similarity metric is most robust ... ?" — explicitly **TBD**. Mentions "Kendall tau, embedding, or hybrid."  
- **`docs/PROJECT_OVERVIEW.md`**, Key Questions (line 45): Same question, also **TBD**.  
- **`docs/CLUSTER_ARCHITECTURE.md`**, Section 1.1: Declares **Rank-Biased Overlap (RBO)** as the **primary** similarity metric (p=0.9), with Kendall Tau-b as secondary and Jaccard as tertiary (lines 34–122). Provides full hybrid formula combining all three.  
- **`docs/TDD.md`**, Chapter 3.1: Locks the metric to **normalized Kendall Tau distance ONLY**: `distance = (1 - kendalltau(ranks_a, ranks_b).correlation) / 2`. RBO is never mentioned.  
- **`src/similarity.py`**: Implements **Kendall Tau only** (no RBO, no Jaccard).  
- **Implication:** CLUSTER_ARCHITECTURE.md is a 1,073-line detailed design document that is almost entirely disconnected from the actual codebase and the locked TDD. The PRD leaves the most important algorithmic decision unresolved, while downstream documents make conflicting commitments.

### 2.3 `context_id` Contract: Mandatory vs. Optional

- **`docs/TDD.md`**, Redline 1 (line 513): "If `context_id` is omitted from any similarity, clustering, or recommendation function signature, or is typed as `Optional` / `str | None`, the design is invalid."  
- **`docs/TDD.md`**, API Surface (Chapter 4): `/similarity?context_id={id}` presents `context_id` as a **query parameter** on a POST endpoint, not as a required path parameter.  
- **`docs/PM_TEAM_BUILDING_PROMPT.md`**, Role 2 (line 252): Explicitly specifies `kendall_distance(a: TasteProfile, b: TasteProfile, context_id: Optional[str])`.  
- **`docs/PM_TEAM_BUILDING_PROMPT.md`**, Role 4 (line 327): "Every endpoint that touches taste data must accept an **optional** context_id." And (line 338): "If context_id is omitted, fall back to profile.default_context."  
- **`src/similarity.py`** (line 46): `context_id: Optional[str] = None`.  
- **`src/clustering.py`** (line 12): `context_id: Optional[str] = None`.  
- **`src/main.py`** (line 35): `context_id: Optional[str] = Query(None, ...)`.  
- **Implication:** The TDD claims a hard mandatory rule, but the actual code, the API design, and the PM role prompts all treat it as optional. This is not a minor typographic issue; it invalidates the "Context-First Rule" (TDD Chapter 1.2) and breaks the functional contract for contextual clustering.

### 2.4 Frontend Scope: API-Only Lock vs. MVP Frontend Demands

- **`docs/TDD.md`**, Redline 5 (line 515): "If the document proposes frontend frameworks (Next.js, Streamlit, React) without an explicit Phase 6 expansion, the design is invalid. Phase 1-5 is API-only."  
- **`docs/PRD.md`**, Section 9 (Out of Scope, line 123): Excludes "Native iOS/Android apps (web-only MVP)," implying a web frontend **is** in scope.  
- **`docs/MILESTONES.md`**, Week 2 (Wed): "Build minimal frontend: input ranked list, see cluster" (line 52). Week 3 (Tue): "Build UI for filter controls." Week 4 (Thu): "UI polish: responsive layout."  
- **`docs/PM_TEAM_BUILDING_PROMPT.md`**, Role 6: Explicitly tasks a "Taste-Focused Frontend Engineer" to build a "minimal web UI (Streamlit or a single-page React app)" (line 418).  
- **`README.md`**, Tech Stack: Lists "Frontend | Next.js (evaluating) | 🟡 Pending Week 3" (line 64).  
- **Implication:** The TDD forbids exactly what the PRD, Milestones, PM guide, and README all assume is required for the demo. The MVP cannot be demonstrated without a frontend, yet the "locked" technical design labels any frontend work as architecturally invalid unless deferred to an unplanned Phase 6.

### 2.5 Data Model: `rank` as Computed Field vs. Parameterized Method

- **`docs/TDD.md`**, Redline 2 (line 514): "If `rank` is stored as a raw integer in the database instead of derived from `visited_at`, the design is invalid."  
- **`docs/TDD.md`**, Redline 6 (line 516): "If `RankedItem.rank` accepts any parameters inside `@computed_field`, or if `occasion_tag` / `source` are typed as plain `str` instead of `Literal[...]`, the design is invalid."  
- **`docs/TDD.md`**, Chapter 2 & Phase 1: Requires `RankedItem.rank` to be a `@computed_field` + `@property` with **zero arguments** other than `self`, returning `float`. Stub must return `0.0`.  
- **`src/models.py`** (lines 23–46): `RankedItem` has **no** `rank` property. Instead, it has `compute_derived_rank(self, reference_time, decay_halflife_days, context_boost)` — a **parameterized method**, not a zero-arg computed field. It also lacks `@computed_field`.  
- **`src/models.py`** (line 20): `occasion_tag: str = "solo"` — **plain `str`**, not a `Literal`.  
- **`src/models.py`** (line 6–10): `Venue` lacks `source` field entirely, and lacks `location`, `cuisines`, `dietary_tags`, `price_tier`, `health_score` required by TDD Chapter 2.  
- **Implication:** The data model in `src/models.py` is architecturally invalid per the TDD's own redlines. It predates the TDD v0.2 rewrite and was never reconciled. Any AI coder following the TDD will attempt to overwrite a model that main.py and clustering.py already import, risking breaking changes.

### 2.6 Recommendation Engine: Astounding Gap Between Spec and Code

- **`docs/PRD.md`**, FR-6 (P0): "Recommendation engine surfaces venues that are: (a) loved by the user’s cluster, and (b) match active filters." FR-7 (P0): "Every recommendation includes a one-sentence explanation."  
- **`docs/CLUSTER_ARCHITECTURE.md`**, Sections 4.1–4.6: Defines a full weighted scoring formula (cluster 0.45 + filter 0.35 + surprise 0.15 + trend 0.05), detailed filter match functions for 6 dimensions, 12 explanation templates, and Jinja2-style generators.  
- **`docs/TDD.md`**, Chapter 3.3: Defines `score(venue, user, context_id) = α·cluster_affinity + β·filter_match + γ·temporal_boost` with exact constants (0.5, 0.3, 0.2). Chapter 3.4 gives exact Jinja2 explanation templates.  
- **`src/main.py`** (lines 67–131): The `/recommendations` endpoint accepts a `TasteProfile` body and `n` count. It has **zero filter parameters** (no `lat`, `lng`, `cuisine`, `diet`, `price_tier`, `health_score`). It returns a deduplicated list of venues sorted by derived rank. It returns **no explanation string**, no `score` field, and no `context_label` in the individual recommendation objects (only at top level).  
- **Implication:** The core value proposition of the product — explainable, filter-aware recommendations — is entirely unimplemented in the API. The 1073-line CLUSTER_ARCHITECTURE.md is pure fiction relative to the running code.

### 2.7 Tech Stack Version Pins: Loose vs. Exact

- **`docs/TDD.md`**, Chapter 6 (lines 409–422): Mandates **exact pinned versions** in `pyproject.toml` and `requirements.txt`. "No unpinned dependencies." Provides exact `pyproject.toml` scaffold with `==` pins (e.g., `fastapi==0.115.0`, `pytest==9.0.0`, `hdbscan==0.8.40`).  
- **`requirements.txt`**: Uses **minimum-version pinning** (`fastapi>=0.111.0`, `pytest>=8.2.0`, `hdbscan>=0.8.0`). No exact versions.  
- **`pyproject.toml`**: Contains **only** `[tool.pytest.ini_options]` (3 lines). No build system, no `[project]` metadata, no dependencies, no version lock.  
- **Implication:** The project's dependency manifest does not comply with its own lock policy. This creates reproducibility risk and makes the "AI-executable" claim of the TDD unenforceable, since an AI rebuild from `pyproject.toml` would install nothing.

### 2.8 API Endpoint Shapes: Spec vs. Implementation

- **`docs/TDD.md`**, Chapter 4: Defines `/users` (POST/GET), `/users/{user_id}/contexts/{context_id}` (PUT), `/similarity?context_id={id}` (POST), `/clusters/recalculate` (POST), `/recommendations` (GET with query params).  
- **`src/main.py`**: Exposes `/health` (GET), `/similarity` (POST), `/recommendations` (POST), `/cluster/assign` (POST).  
- **Specific mismatches:**
  - TDD `/clusters/recalculate` → Code `/cluster/assign` (different path, different semantics).
  - TDD `/recommendations` is GET with query params → Code is POST with body.
  - TDD `/users` and `/users/{user_id}` → **Missing entirely** from code.
  - TDD `PUT /users/{user_id}/contexts/{context_id}` → **Missing entirely**.
  - TDD `ErrorResponse` shape (`{"error", "message", "detail"}`) → Code returns ad-hoc dicts with no standardized error schema.
- **Implication:** The API surface is an ungoverned mismatch. The PM handoff guide (Gate 4→5) checks for endpoints that do not exist per the TDD, and the TDD checks for endpoints that do not exist in the code. Neither source of truth is satisfied.

### 2.9 Silhouette Score Targets: 0.3 vs. 0.4 vs. 0.5 vs. Forbidden

- **`docs/PRD.md`**, Section 3.2: Target "Silhouette > 0.4 or visual sanity check."  
- **`docs/PROJECT_OVERVIEW.md`**, Success Metrics: "Silhouette score > 0.5 or qualitative validation."  
- **`docs/CLUSTER_ARCHITECTURE.md`**, Section 2.3: "Target: Silhouette > 0.4."  
- **`docs/PM_TEAM_BUILDING_PROMPT.md`**, Gate 0→1: "silhouette > 0.3."  
- **`docs/TDD.md`**, Chapter 9 Risks: "AI imports sklearn for silhouette analysis or elbow method → Forbidden in stack lock. HDBSCAN requires no preset K. No silhouette analysis needed."  
- **`tests/`**: No silhouette computation exists in any test file.  
- **Implication:** Four different targets (0.3, 0.4, 0.5, none) are spread across documents. The TDD forbids the very metric the PRD requires.

### 2.10 Synthetic Data Generator Location & Volume

- **`docs/TDD.md`**, Chapter 5 File Tree & Phase 4: Requires `scripts/generate_synthetic_data.py`. Requires 100 users × 3 contexts each (`default`, `date_night`, `solo_comfort`).  
- **`src/synthetic_data.py`**: Exists at `src/synthetic_data.py`, not `scripts/`. Generates **4 contexts** (`default`, `date_night`, `solo_comfort`, `business_lunch`) and defaults to **30 users**.  
- **Implication:** File tree mismatch will break imports if an AI coder follows the TDD scaffold literally. The dataset size and context set do not match the integration test spec in TDD Phase 3.

---

## 3. Critical Blind Spots (The "Missing" Audit)

### 3.1 `docs/AGENTS.md` — The Supreme Constraint Document Is Entirely Absent

- **Cited by:** `docs/TDD.md` (v0.2, line 9: "Supreme Constraint: `docs/AGENTS.md` — Three Pillars + Scraping Policy"), `docs/TDD_REWRITE_PROMPT.md` (line 12: "Enforces `AGENTS.md` as the supreme architectural constraint"), and `SYSTEM_PROMPT.md` (which itself describes the Three Pillars).  
- **Impact:** This is the project's constitutional document. Its absence means the TDD's redlines have no foundational authority, and the "Three Pillars" exist only in the SYSTEM_PROMPT.md meta-document, which is not part of the formal docs folder. Every claim in the TDD that references AGENTS.md is an unresolvable hyperlink.

### 3.2 `docs/DATA_CONTRACT.md` — Mandatory Handoff Artifact Missing

- **Cited by:** `docs/PM_TEAM_BUILDING_PROMPT.md`, Handoff Gate 5→6 (line 133): "Data contract is documented in `docs/DATA_CONTRACT.md`." Gate 6→7 (line 155): checks that "`docs/DATA_CONTRACT.md` and all upstream files are unchanged."  
- **Impact:** The PM conveyor belt explicitly gates frontend development on this document. Without it, the frontend engineer has no canonical JSON request/response shapes beyond the scattered and contradictory API drafts in TDD vs. main.py.

### 3.3 `docs/DEMO_SCRIPT.md` — Final Deliverable Missing

- **Cited by:** `docs/PM_TEAM_BUILDING_PROMPT.md`, Handoff Gate 8→Final (line 181): "Demo script `docs/DEMO_SCRIPT.md` exists and is rehearsed."  
- **Impact:** The 6-week internship culminates in a demo. There is no script, no backup profiles, no cold-start recovery path, and no rehearsal artifact. The project cannot be demonstrated as planned.

### 3.4 `src/db.py` — Persistence Layer Entirely Missing

- **Cited by:** `docs/TDD.md`, Chapter 5 & Phase 5: mandates `src/db.py` with SQLAlchemy Core table definitions (`users`, `contexts`, `ranked_items`), async `get_db()` generator, and 1:1 column mapping to Pydantic models.  
- **Impact:** The codebase has **zero persistent storage**. The API uses an in-memory dictionary (`_data_store`) that is rebuilt from synthetic data on every cold start. The `/users` endpoints do not exist. Any demo requiring user creation, list mutation, or cluster recalculation across restarts will fail.

### 3.5 `pytest.ini` — Required Scaffold Missing

- **Cited by:** `docs/TDD.md`, Chapter 6 Scaffold Appendix: "`pytest.ini` — `testpaths = tests`, `addopts = -v --tb=short`." Also listed in Chapter 5 file tree.  
- **Impact:** pytest config is only in `pyproject.toml` (3 lines). The TDD treats `pytest.ini` as a mandatory separate file.

### 3.6 `tests/test_models.py` and `tests/test_api.py` — Required Test Suites Missing

- **Cited by:** `docs/TDD.md`, Chapter 5 file tree and Phase 1 / Phase 5 deliverables.  
- **Impact:** Pydantic model validation, enum rejection, serialization round-trips, and API route coverage (including error shapes) are completely untested. The TDD's "AI-executable" validation checklist cannot be executed.

### 3.7 `src/recommendations.py` — Scoring & Explanation Module Missing

- **Cited by:** `docs/TDD.md`, Chapter 5 file tree: lists `src/recommendations.py` for "scoring and explanation templates."  
- **Impact:** The core product logic — weighted recommendation scoring and one-sentence explanation generation — has no module. It is crudely inlined into `main.py` with none of the filters, weights, or templates defined in TDD Chapter 3.3–3.4 or CLUSTER_ARCHITECTURE.md Section 4.

### 3.8 Venue Metadata Schema — 95% Unimplemented

- **Specified in:** `docs/CLUSTER_ARCHITECTURE.md` Section 3.1 (`VenueMetadata` class with 15+ fields), `docs/TDD.md` Chapter 2 (`Venue` with `location`, `cuisines`, `dietary_tags`, `price_tier`, `health_score`, `source`).  
- **Actual:** `src/models.py` `Venue` has only `id` and `name`.  
- **Impact:** Filter-based recommendation scoring is impossible because the data model cannot represent cuisines, dietary tags, price, health, or location. The entire filter pipeline is blocked by schema absence.

---

## 4. Execution Roadblocks & Dependencies

### 4.1 The `AGENTS.md` Blocker (Severity: Critical)

Until `docs/AGENTS.md` is written and ratified, the TDD v0.2 cannot claim supreme authority. Any dispute between TDD and CLUSTER_ARCHITECTURE.md (e.g., RBO vs. Kendall, AHC vs. HDBSCAN) has no adjudication mechanism. **Action:** Draft AGENTS.md, merge it, and then force-align all downstream documents.

### 4.2 The `models.py` Rewrite Blocker (Severity: Critical)

`src/models.py` violates TDD Redlines 2 and 6. It cannot be incrementally patched; it requires a breaking rewrite to introduce `Literal` types, the `@computed_field rank` stub, and full `Venue` metadata fields. Because `similarity.py`, `clustering.py`, `main.py`, and all tests import `models.py`, this rewrite will create a cascade of breaking changes across the entire codebase. **Action:** Schedule the rewrite as Phase 0, before any PM pipeline role begins.

### 4.3 The API Shape Discord Blocker (Severity: High)

`main.py` endpoints do not match TDD Chapter 4. Attempting to build a frontend against the current API (as PM Role 6 requires) will produce an incompatible integration. Attempting to build the frontend against the TDD API will require rewriting `main.py` from scratch. **Action:** Freeze one API specification (recommend: TDD Chapter 4) and rewrite `main.py` and add `db.py` before frontend work begins.

### 4.4 The CI/CD Placeholder Blocker (Severity: Medium)

`.github/workflows/ci.yml` is a non-functional lint placeholder. No tests run in CI. The test suite contains tests that depend on `hdbscan`, which has C++ extensions; building these in CI requires a proper Python setup step that is commented out. **Action:** Uncomment and fix the CI workflow, ensure `requirements.txt` is installable in a clean environment, and validate that `pytest` passes before any handoff.

### 4.5 The Clustering Parameter Drift Blocker (Severity: Medium)

`src/clustering.py` uses `allow_single_cluster=True` and `min_cluster_size=3`, while TDD mandates `False` and `5`. Changing these will alter cluster assignments, potentially breaking the synthetic data tests that assert noise points exist. **Action:** Update clustering parameters to match TDD, then regenerate deterministic test baselines.

### 4.6 The MILESTONES.md Algorithmic Misdirection Blocker (Severity: Medium)

Week 2 of MILESTONES.md incorrectly prescribes K-Means. If a contractor follows the milestones doc (which is likely, since it is the "schedule"), they will introduce a forbidden algorithm. **Action:** Amend MILESTONES.md to reference HDBSCAN and align with TDD v0.2.

---

## 5. Consolidated Revision List (Prioritized)

### Priority P0 — Mandatory Before Any Development Resumes

1. **Create `docs/AGENTS.md`**: Codify the Three Pillars + Scraping Policy from `SYSTEM_PROMPT.md` into a formal, immutable reference in the docs folder.
2. **Rewrite `src/models.py` to comply with TDD Chapter 2 & Redlines 2/6**:
   - Add `Literal` types for `occasion_tag` and `source`.
   - Replace `compute_derived_rank` method with `@computed_field` + `@property rank(self) -> float` (stub returning `0.0`).
   - Expand `Venue` to include `location`, `cuisines`, `dietary_tags`, `price_tier`, `health_score`, `source`.
   - Add `ClusterResult` Pydantic model.
3. **Rewrite `src/main.py` to match TDD Chapter 4**:
   - Implement `POST /users`, `GET /users/{user_id}`, `PUT /users/{user_id}/contexts/{context_id}`.
   - Rename `/cluster/assign` to `/clusters/recalculate` (or vice versa — pick one spec).
   - Change `/recommendations` to GET with filter query params and return `List[Recommendation]` with `score`, `explanation`, and `context_id`.
   - Implement standardized `ErrorResponse` schema for all 4xx errors.
4. **Create `src/db.py`**: SQLAlchemy Core tables for `users`, `contexts`, `ranked_items` with async `get_db()` dependency generator.
5. **Align `requirements.txt` and `pyproject.toml` with TDD Chapter 6**: Use exact `==` pins. Populate `pyproject.toml` with full `[project]` metadata, `[build-system]`, and dependencies.
6. **Create `pytest.ini`**: As specified in TDD Chapter 6.

### Priority P1 — Mandatory Before Frontend / Demo Work

7. **Move/rename `src/synthetic_data.py` to `scripts/generate_synthetic_data.py`** per TDD file tree, or update TDD to reflect actual path.
8. **Adjust synthetic dataset parameters**: Ensure 100 users × 3 contexts (`default`, `date_night`, `solo_comfort`) to match TDD Phase 4.
9. **Create `src/recommendations.py`**: Implement scoring formula (α=0.5, β=0.3, γ=0.2) and explanation templates from TDD Chapter 3.3–3.4.
10. **Create `tests/test_models.py`**: Pydantic validation, enum rejection, round-trip serialization.
11. **Create `tests/test_api.py`**: 100% route coverage with `fastapi.testclient.TestClient`, asserting exact error response shapes.
12. **Create `docs/DATA_CONTRACT.md`**: Exact JSON request/response shapes with copy-pasteable examples.
13. **Fix `.github/workflows/ci.yml`**: Uncomment Python setup, dependency install, and `pytest` run. Remove placeholder lint step or make it functional.

### Priority P2 — Mandatory Before Final Demo

14. **Create `docs/DEMO_SCRIPT.md`**: Step-by-step script with exact commands, hardcoded profiles, failure recovery paths, and timing budget.
15. **Resolve CLUSTER_ARCHITECTURE.md fate**: Either mark it as "Superseded by TDD v0.2" (recommended, since it contradicts TDD on clustering, similarity, and API shape) or reconcile its RBO/scoring content into a future Phase 6 expansion doc.
16. **Amend `docs/MILESTONES.md`**: Remove "K-Means" reference. Insert `context_id` requirements into Week 2. Align frontend timeline with TDD Redline 5 or explicitly define Phase 6.
17. **Add `tests/test_recommendations.py`**: Assert explanation non-emptiness, character limit (≤120), filter behavior, and noise fallback.
18. **Fix `src/clustering.py` parameters**: Set `allow_single_cluster=False` and default `min_cluster_size=5` to match TDD.
19. **Resolve `context_id` Optional vs. Mandatory**: Either update TDD Redline 1 to match reality (optional with fallback) or rewrite all function signatures and API specs to make it strictly mandatory. A PM cannot hand off contradictory instructions.
20. **Reconcile Similarity Metric decision**: Update PRD Section 8 and PROJECT_OVERVIEW.md Key Questions to state "Kendall Tau (locked in TDD v0.2)" and remove "TBD." Archive RBO content from CLUSTER_ARCHITECTURE.md or add it to an "Algorithm Evaluation" appendix.

---

*Audit complete. 20 mandatory action items identified across 5 priority tiers.*
