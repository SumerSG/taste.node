# PM Orchestration Guide: taste.node MVP

> **How to use this document:**
> You are the Founding PM. The goal is a working, demoable MVP of taste.node. This guide tells you **which role to hire (or prompt) and when**, and exactly **what to hand off** between them. Roles are strictly sequential. Do not start Role N+1 until Role N has passed the handoff checklist.
>
> **Planning-Only Notice:** This repository currently contains **no implementation code**. The prompts below describe the Phase 0 conveyor belt once code consolidation is formally kicked off. See `PLANNING_HYGIENE.md` for repository policy.

---

## Part 1: MVP Definition & Phase Plan

| Phase | Name | Duration | Goal | Primary Output |
|---|---|---|---|---|
| 0 | Foundation | 3 days | Deterministic synthetic dataset produces coherent HDBSCAN clusters. | `scripts/generate_synthetic_data.py` + validation |
| 1 | Similarity Engine | 4 days | Contextual Kendall similarity with temporal weighting works end-to-end. | `similarity.py` + `clustering.py` + tests |
| 2 | API Shell | 3 days | FastAPI exposes contextual endpoints for similarity, cluster assignment, and recommendations. | `main.py` + testable API |
| 3 | Data Model Lock | 4 days | Onboarding flow captures `visited_at` and `occasion_tag` correctly. | `DATA_CONTRACT.md` + integratable models |
| 4 | Frontend | 4 days | User can create a TasteProfile and see their cluster label + recommendations. | Working UI against real API |
| 5 | Explainability | 4 days | Recommendations include one-sentence cluster-based explanations. | Enriched recs + UI polish |
| 6 | Demo Lock | 3 days | End-to-end demo rehearsed; no scope creep; all tests green. | `DEMO_SCRIPT.md` + stability |

**Total: ~25 calendar days**

> **Hypothesis to prove:** *Two people with similar contextual restaurant rankings are better matched by density-based clustering than by star ratings.*

**Out of scope for MVP:**
- Public API integration (Yelp/Google)
- Multi-context switching UI
- Social/group dining features
- Time-decay visualizations in UI (data is captured; not surfaced)
- Real-time cluster recalculation triggers

---

## Part 2: Sequential Role Pipeline

| Sequence | Role | Starts After | Phase | Duration |
|---|---|---|---|---|
| 1 | **Synthetic Data Engineer** | PM kickoff | 0 | 3 days |
| 2 | **Taste Similarity Engineer** | Role 1 handoff | 1 | 2 days |
| 3 | **HDBSCAN Clustering Engineer** | Role 2 handoff | 1 | 2 days |
| 4 | **Contextual API Engineer** | Role 3 handoff | 2 | 3 days |
| 5 | **Temporal Data Model Designer** | Role 4 handoff | 3 | 2 days |
| 6 | **Taste-Focused Frontend Engineer** | Role 5 handoff | **6** | 4 days |
| 7 | **Recommendation Engineer** | Role 6 handoff | 5 | 2 days |
| 8 | **Demo Quality Engineer** | Role 7 handoff | **7** | 3 days |

> **Phase Gating Note:** Frontend work (Role 6) is **Phase 6** per TDD v0.2 Redline 5. It cannot begin until TDD Phases 1–5 are locked, `src/db.py` exists, and `docs/DATA_CONTRACT.md` is ratified. If the API surface is not stable, do not start frontend.

**PM Rule:** The pipeline is a conveyor belt, not a team sport. One person at a time. If a role is blocked, the entire pipeline stops.

---

## Part 3: Handoff Policy

The PM is the only person who can authorize a handoff. No engineer may hand off to the next role without the PM signing the checklist.

### Handoff Gate 0 → 1: PM → Synthetic Data Engineer

| Checkpoint | PM Verifies | Pass / Block |
|---|---|---|
| PRNG seed is configurable and documented | Can run `python scripts/generate_synthetic_data.py --seed 42` and get identical output | |
| N = 100 profiles generated (exactly, per TDD Phase 4) | Counts profiles in output | |
| Every profile has a `default` context | Inspects JSON output | |
| Persona taxonomy exists (≥ 4 personas) | Reads docs or inline comments | |
| Determinism test exists | `pytest` has a test that fails if output changes between runs | |
| Validation script reports ≥ 3 clusters | Runs script and reads stdout | |

**PM Action if Blocked:** Reject deliverable. Require deterministic output before any downstream work begins.

---

### Handoff Gate 1 → 2: Synthetic Data Engineer → Taste Similarity Engineer

| Checkpoint | PM Verifies | Pass / Block |
|---|---|---|
| Synthetic data script runs without errors | PM runs it fresh in a clean env | |
| Output is 100% deterministic | Runs twice, compares checksums | |
| `TasteProfile` and `TasteContext` models are respected | Inspects `src/models.py` against spec | |
| At least 2 personas produce distinct clusterable profiles | Validation script output | |
| Data is fully synthetic (no real venue names, no scraped data) | Manual inspection | |

---

### Handoff Gate 2 → 3: Taste Similarity Engineer → HDBSCAN Clustering Engineer

| Checkpoint | PM Verifies | Pass / Block |
|---|---|---|
| All tests in `tests/test_similarity.py` pass | `pytest tests/test_similarity.py -v` | |
| Perfect correlation → distance 0.0 | Reads test assertion | |
| Inverse correlation → distance 1.0 | Reads test assertion | |
| No overlap → None (not 0.0) | Reads test assertion | |
| Temporal weights are computed | Inspects `extract_shared_venues` return signature | |
| Distance values are in [0, 1] | Asserts range in test | |
| Works with `context_id` parameter | Tests show contextual comparison | |
| `src/models.py` has NOT been modified | `git diff` check | |

**Blocked?** Similarity must be flawless before clustering can begin. Clustering depends on distances being correct.

---

### Handoff Gate 3 → 4: HDBSCAN Clustering Engineer → Contextual API Engineer

| Checkpoint | PM Verifies | Pass / Block |
|---|---|---|
| All tests in `tests/test_clustering.py` pass | `pytest tests/test_clustering.py -v` | |
| HDBSCAN is the only clustering algorithm imported | `grep -r "KMeans\|kmeans\|Agglomerative" src/` returns nothing | |
| Noise points (-1) are tested and valid | Test explicitly asserts label == -1 | |
| Distance matrix handles None as max distance (1.0) | Test asserts no NaN and range [0, 1] | |
| `ContextualClusterMap` can fit multiple contexts | Test runs fit_context twice with different context_ids | |
| `src/similarity.py` has NOT been modified | `git diff` check | |

**Blocked?** If clustering fails, the API has nothing to serve.

---

### Handoff Gate 4 → 5: Contextual API Engineer → Temporal Data Model Designer

| Checkpoint | PM Verifies | Pass / Block |
|---|---|---|
| API starts without errors | `uvicorn src.main:app` boots successfully | |
| `POST /similarity` returns a score or null | Hits endpoint with two profiles via curl/httpx | |
| `POST /clusters/recalculate` returns a ClusterResult | Hits endpoint and inspects JSON | |
| `GET /recommendations` returns a List[Recommendation] | Hits endpoint and counts array length | |
| `context_id` query parameter works on all endpoints | Tests with and without parameter | |
| Health check returns `{"status": "ok"}` | GET /health | |
| `src/models.py` and `src/similarity.py` and `src/clustering.py` are unchanged | `git diff` check | |

**Blocked?** The data model designer needs a working API to understand what the frontend will actually POST.

---

### Handoff Gate 5 → 6: Temporal Data Model Designer → Taste-Focused Frontend Engineer

| Checkpoint | PM Verifies | Pass / Block |
|---|---|---|
| Data contract is documented in `docs/DATA_CONTRACT.md` | File exists and is readable | |
| JSON request shapes are copy-pasteable | PM copies an example into a curl command and it works | |
| Every optional field has a documented default | Checked against actual API behavior | |
| Edge cases are handled (missing context_id, unknown venue, duplicate) | PM tests each case via curl | |
| Occasion tags are strictly from the taxonomy: solo, date, business, group, comfort | Enum or validation exists | |
| `visited_at` defaults to `now()` when omitted | Tested with a POST missing the field | |
| `src/main.py` and all upstream files are unchanged | `git diff` check | |

**Blocked?** Frontend cannot build without knowing exactly what JSON to send.

---

### Handoff Gate 6 → 7: Frontend Engineer → Recommendation Engineer

| Checkpoint | PM Verifies | Pass / Block |
|---|---|---|
| User can onboard in < 2 minutes | PM times themselves | |
| Cluster label is visible after onboarding | Screenshots or live demo | |
| Recommendations are visible | UI shows at least 1 recommendation | |
| Noise users get a graceful message | PM creates a profile with 1 item and checks UI text | |
| UI is readable on a projector | PM views at 100% zoom on a 13" screen | |
| UI calls the actual API (not mocked) | Network tab or backend logs show requests | |
| `docs/DATA_CONTRACT.md` and all upstream files are unchanged | `git diff` check | |

**Blocked?** Recommendations need a live UI to know where explanations appear.

---

### Handoff Gate 7 → 8: Recommendation Engineer → Demo Quality Engineer

| Checkpoint | PM Verifies | Pass / Block |
|---|---|---|
| Every recommendation has a non-empty explanation | Inspects API response or UI | |
| Explanations are <= 120 characters | Sampled and measured | |
| Noise fallback explanation exists | Triggered with a 1-item profile | |
| No user-identifying data in explanations | String inspection | |
| Explanations are tested in `tests/` | `pytest` passes | |
| Frontend still works after explanation integration | End-to-end walkthrough | |

**Blocked?** Bad explanations ruin the demo. This gate must be strict.

---

### Handoff Gate 8 → Final: Demo Quality Engineer → PM (Demo Day)

| Checkpoint | PM Verifies | Pass / Block |
|---|---|---|
| Full test suite is 100% green | `pytest` output | |
| Demo script `docs/DEMO_SCRIPT.md` exists and is rehearsed | PM runs through it once | |
| Cold-start user (< 3 venues) handled gracefully | Tested in demo script | |
| Backup profiles exist for guaranteed cluster assignment | PM inspects JSON files or inline seeds | |
| Total runtime from `git clone` to final rec is < 5 minutes | Stopwatch | |
| No external dependencies (API keys, internet) required | Airplane-mode test | |
| All upstream files are frozen | `git diff` shows only docs changes | |

**Blocked?** If any checkpoint fails, demo is not ready. Slip the date, do not demo broken code.

---

## Part 4: Role Prompt Library

Give the role prompt below to the person (or agent) you engage. Each prompt assumes all prior phases and handoff gates are complete.

---

### Role 1: Synthetic Data Engineer
**Engage:** Phase 0, Day 1  
**Handoff from:** PM direct kickoff  
**Hands off to:** Taste Similarity Engineer  
**Duration:** 3 days

```
You are the Synthetic Data Engineer for taste.node.

Context:
- taste.node is a contextual taste-matching platform. Users rank restaurants within contexts like 'solo', 'date', 'business'.
- We need a fully synthetic, deterministic dataset to validate clustering before any real users onboard.
- Architecture uses HDBSCAN on normalized Kendall Tau distances. Clusters must be non-spherical, density-based.
- Temporal metadata matters: RankedItem has visited_at and occasion_tag. rank is derived from list order.

Your Task:
1. Design a persona taxonomy (e.g., 'ramen_lover', 'michelin_chaser', 'casual_explorer') with distinct venue affinities.
2. **Generate exactly 100 synthetic TasteProfiles, each with exactly 3 contexts (`default`, `date_night`, `solo_comfort`) per TDD v0.2 Phase 4.** Personas must produce visually separable clusters when run through HDBSCAN.
3. Ensure visited_at dates are varied (not all today) so temporal decay is testable.
4. Export deterministic output: seed must be configurable; same seed = identical dataset.
5. Provide a validation script: run HDBSCAN on your data and report cluster count.

Constraints:
- No production data. No scrapers. No real venue names.
- Venue names can be synthetic (e.g., "Golden Bistro 12").
- Default context ('default') must exist on every profile.
- **Code goes in `scripts/generate_synthetic_data.py` per TDD v0.2 Chapter 5 file tree.**
- **Persona biases must be strong enough to guarantee HDBSCAN produces ≥ 3 clusters at `min_cluster_size=5` on the default seed (42). If validation reports fewer than 3 clusters, the deliverable is blocked.**

Definition of Done (PM will verify every item):
- [ ] Script runs with `python scripts/generate_synthetic_data.py --seed 42`
- [ ] Output is deterministic (md5sum matches across runs)
- [ ] A test in `tests/test_synthetic_data.py` verifies deterministic output
- [ ] Persona bias test: at least one persona produces distinct top venues
- [ ] Validation script reports >= 3 clusters on the default seed (silhouette analysis is prohibited per TDD v0.2 stack lock; use visual sanity check or cluster count instead)
```

---

### Role 2: Taste Similarity Engineer
**Engage:** Phase 1, Day 4  
**Handoff from:** Synthetic Data Engineer (after Gate 1→2)  
**Hands off to:** HDBSCAN Clustering Engineer  
**Duration:** 2 days

```
You are the Taste Similarity Engineer for taste.node.

Context:
- Users have contextual taste profiles. Similarity must be computed within a single context.
- The metric is normalized Kendall Tau distance: distance = (1 - tau) / 2, giving [0, 1].
- NaN or missing overlap must return None (distinguish "no data" from "total disagreement").
- Temporal decay: a shared venue visited 2 years ago should weigh less than one visited 2 weeks ago, unless tagged 'classic'.

Your Task:
1. Implement `kendall_distance(a: TasteProfile, b: TasteProfile, context_id: str)` in `src/similarity.py`.
2. Implement kendall_similarity as 1 - distance (or None).
3. Add extract_shared_venues that returns ranks + time-decay weights.
4. Decay formula: halflife = 365 days; classic tags override decay to 1.0.
5. Write tests proving:
   - Perfect correlation -> distance 0.0, similarity 1.0
   - Inverse correlation -> distance 1.0, similarity 0.0
   - No overlap -> None (not 0.0)
   - Contextual comparison works across distinct contexts

Constraints:
- Do not assume a global ranked list. Always index into TasteProfile.contexts.
- Must handle < 2 shared venues gracefully (return None).
- Code must be compatible with HDBSCAN precomputed distance matrix.
- Do NOT modify src/models.py. Use it as-is.

Definition of Done (PM will verify every item):
- [ ] pytest tests/test_similarity.py passes 100%
- [ ] No overlap returns None (not 0.0)
- [ ] Temporal weights are computed and can be logged for debugging
- [ ] Distance output is in [0, 1]
```

---

### Role 3: HDBSCAN Clustering Engineer
**Engage:** Phase 1, Day 6  
**Handoff from:** Taste Similarity Engineer (after Gate 2→3)  
**Hands off to:** Contextual API Engineer  
**Duration:** 2 days

```
You are the HDBSCAN Clustering Engineer for taste.node.

Context:
- Taste clusters are NOT spherical. "Burger lovers" and "Michelin chasers" form non-Euclidean, density-varying blobs.
- HDBSCAN is the chosen algorithm (not K-Means). It accepts precomputed distance matrices and naturally supports noise points (users who don't fit any cluster).
- Clustering is contextual: a user may be in cluster A for 'date_night' and cluster B for 'business_lunch'.

Your Task:
1. Implement build_distance_matrix() that computes pairwise Kendall distances for all users within a context. No-overlap pairs get max distance (1.0).
2. Implement cluster_profiles_hdbscan() using hdbscan.HDBSCAN(metric='precomputed').
3. Build ContextualClusterMap that maintains one label map per context_id.
4. Ensure noise points are labeled -1 and handled gracefully (do not force them into clusters).
5. Write tests verifying:
   - Matrix is square, symmetric, diagonal is 0
   - NaN/None distances are replaced with 1.0
   - Too few users returns all -1 (noise)
   - Labels are integers; noise is -1

Constraints:
- min_cluster_size must be configurable and tested.
- Do NOT implement K-Means. Any alternative to HDBSCAN needs PM sign-off.
- Do NOT modify src/similarity.py or src/models.py. Import and use them as-is.
- Code goes in src/clustering.py.

Definition of Done (PM will verify every item):
- [ ] pytest tests/test_clustering.py passes 100%
- [ ] HDBSCAN is the only clustering algorithm shipped
- [ ] Noise labels (-1) are tested and valid
- [ ] ContextualClusterMap can fit multiple contexts independently
```

---

### Role 4: Contextual API Engineer
**Engage:** Phase 2, Day 8  
**Handoff from:** HDBSCAN Clustering Engineer (after Gate 3→4)  
**Hands off to:** Temporal Data Model Designer  
**Duration:** 3 days

```
You are the Contextual API Engineer for taste.node.

Context:
- taste.node exposes a FastAPI service. Every endpoint that touches taste data must accept a `context_id` query parameter, falling back to `profile.default_context` when omitted per TDD v0.2 Chapter 1.2 and `docs/AGENTS.md` Pillar 3.
- **Persistent storage is required via `src/db.py` (SQLite + SQLAlchemy Core) per TDD Phase 5. In-memory dict is not sufficient.**
- Endpoints needed: `POST /users`, `GET /users/{user_id}`, `PUT /users/{user_id}/contexts/{context_id}`, health check, similarity, cluster recalculation, recommendations.

Your Task:
1. Update `src/main.py` with endpoints per TDD Chapter 4:
   - `POST /users` — create persisted taste profile
   - `GET /users/{user_id}` — retrieve taste profile
   - `PUT /users/{user_id}/contexts/{context_id}` — upsert contextual ranked list
   - `POST /similarity`: accepts two `TasteProfile` objects + optional `context_id`. Returns `{distance, shared_venues, context_id}`.
   - `POST /clusters/recalculate`: accepts `context_id`. Returns `ClusterResult`.
   - `GET /recommendations`: accepts `user_id`, optional `context_id`, filter params, and `n`. Returns `List[Recommendation]` with `score` and `explanation`.
2. All error responses must conform to the `ErrorResponse` schema from TDD Chapter 4.2.
3. If `context_id` is omitted, fall back to `profile.default_context`.
4. Wire synthetic data as the initial seed store via `src/db.py`.

Constraints:
- **Implement `src/db.py` with SQLAlchemy Core tables (`users`, `contexts`, `ranked_items`) matching TDD Chapter 6. Do not use raw SQL strings in app code.**
- Do not expose raw vectors or internal distance matrices to the client.
- All Pydantic models must match `src/models.py` exactly.
- Do NOT modify `src/similarity.py` or `src/clustering.py`. Import them as-is.

Definition of Done (PM will verify every item):
- [ ] API starts with `uvicorn src.main:app --reload` without errors
- [ ] `POST /users` creates and persists a taste profile
- [ ] `GET /users/{user_id}` retrieves a persisted profile
- [ ] `PUT /users/{user_id}/contexts/{context_id}` upserts a contextual ranked list
- [ ] `POST /similarity` with two synthetic profiles returns a distance in [0, 1] or null
- [ ] `GET /recommendations` returns top N venues with `score`, `explanation`, and `venue.model_dump()`
- [ ] All endpoints accept an optional `?context_id` query parameter
- [ ] Health check returns `{"status": "ok"}`
```

---

### Role 5: Temporal Data Model Designer
**Engage:** Phase 3, Day 11  
**Handoff from:** Contextual API Engineer (after Gate 4→5)  
**Hands off to:** Taste-Focused Frontend Engineer  
**Duration:** 2 days

```
You are the Temporal Data Model Designer for taste.node.

Context:
- The MVP must capture temporal metadata at onboarding even though we won't surface time-decay sliders in the UI yet.
- RankedItem now requires visited_at and occasion_tag. Rank is derived from list order.
- Users do not think in terms of "metadata." They think: "I ate here on a date last Friday."

Your Task:
1. Design the onboarding data capture flow:
   - How does a user input a venue into their ranked list?
   - How do we capture when they visited (visited_at) without UX friction?
   - How do we capture why they visited (occasion_tag) with a smart default?
2. Define the Pydantic request/response schemas for:
   - Creating a TasteProfile with contexts
   - Adding a RankedItem to an existing context
   - Updating default_context
3. Ensure backwards compatibility: if the UI does not send visited_at, default to now(). If occasion_tag is missing, default to "solo".
4. Document the exact JSON shapes the frontend must send.

Constraints:
- No more than 2 taps/clicks to add a venue.
- occasion_tag options: solo | date | business | group | comfort
- visited_at must be ISO8601 string or omitted.
- Do not design UI visuals. Define the data contract and ideal interaction flow only.
- Do NOT modify src/main.py, src/models.py, or upstream files. You may add a docs/ file.

Definition of Done (PM will verify every item):
- [ ] Data model spec documented in docs/DATA_CONTRACT.md
- [ ] JSON request shapes are copy-pasteable for frontend integration (PM will test with curl)
- [ ] Default values are specified for every optional field
- [ ] Edge cases are handled (missing context_id, unknown venue_id, duplicate venue in same context)
```

---

### Role 6: Taste-Focused Frontend Engineer
**Engage:** Phase 6, Day 19  
**Handoff from:** Temporal Data Model Designer (after Gate 5→6)  
**Hands off to:** Recommendation Engineer  
**Duration:** 4 days

```
You are the Taste-Focused Frontend Engineer for taste.node.

> **Phase Gate:** This is **Phase 6** work per TDD v0.2 Redline 5. It cannot begin until TDD Phases 1–5 are complete, `src/db.py` is implemented, and `docs/DATA_CONTRACT.md` is ratified.

Context:
- The MVP frontend must let a user create a ranked list of venues and see their cluster label.
- This is not a generic CRUD app. The product sells "your taste is contextual and evolving." The UI should feel like ranking, not like filling a form.
- Backend endpoints exist at `POST /similarity`, `POST /clusters/recalculate`, `GET /recommendations`. The data contract is locked in `docs/DATA_CONTRACT.md`.

Your Task:
1. Build a minimal web UI (Streamlit or a single-page React app) with three screens:
   - **Screen 1: Onboarding** — User enters `user_id` and builds their first ranked list. Drag-and-drop or sequential entry is acceptable. Hidden fields: `visited_at` defaults to now, `occasion_tag` defaults to "solo".
   - **Screen 2: Cluster Result** — Shows the user's cluster label after `POST /clusters/recalculate`. If noise (-1), show a friendly message: "You're still exploring — add more venues to unlock your taste cluster."
   - **Screen 3: Recommendations** — Shows top 5 recommended venues with a one-line explanation returned by `GET /recommendations`.
2. The UI must call the FastAPI backend. Use the existing Pydantic models as the JSON contract.
3. Handle errors gracefully (backend down, noise user, empty list).

Constraints:
- Keep it demo-friendly (readable on a projector, no tiny text).
- Do not build multi-context switching UI for MVP. Default context only.
- Do not build login/auth. A text input for user_id is fine.
- Focus on the single user story: create list -> see cluster -> get recs.
- Do NOT modify backend code. Use the API as-is.

Definition of Done (PM will verify every item):
- [ ] A neutral user can onboard, get a cluster label, and see recommendations in < 2 minutes
- [ ] Demo runs entirely locally with `uvicorn src.main:app` + frontend dev server
- [ ] Noise users get a graceful fallback message
- [ ] UI text is large enough for a screen-share demo (PM checks at 100% zoom)
```

---

### Role 7: Recommendation Engineer
**Engage:** Phase 5, Day 17  
**Handoff from:** Frontend Engineer (after Gate 6→7)  
**Hands off to:** Demo Quality Engineer  
**Duration:** 2 days

```
You are the Recommendation Engineer for taste.node.

Context:
- The demo must prove value in one sentence. Every recommendation needs a human-readable explanation tied to the cluster.
- Recommendations are contextual and cluster-based. We do not have real venue metadata yet (cuisines, dietary tags), so the explanation must rely on cluster membership alone.
- The MVP uses the synthetic dataset, so explanations will reference other synthetic users. That is acceptable for the demo as long as it validates the mechanism.

Your Task:
1. Enrich the **`GET /recommendations` endpoint** (via `src/recommendations.py`) so every returned recommendation includes:
   - venue: the venue object
   - score: float in [0, 1] computed per the locked scoring formula from TDD v0.2 Chapter 3.3: `α=0.5 cluster_affinity + β=0.3 filter_match + γ=0.2 temporal_boost`
   - explanation: a one-sentence string ≤ 120 characters
   - reason: one of 'cluster', 'filter', 'surprise', 'trend', 'noise_fallback'
2. Implement explanation templates:
   - Cluster: "{N} people in your taste cluster loved this."
   - Noise fallback: "Popular among all users — add more venues to unlock your cluster."
3. If time permits, add a very light "surprise" bonus: venues popular in the cluster but NOT in the user's current top 3 cuisines.
4. Ensure explanations are never empty and never expose raw user IDs or names (privacy).

Constraints:
- Explanations must be <= 120 characters.
- No user-identifying data in explanations (first names only if explicitly consented).
- Template-based generation is fine. LLMs are out of scope for MVP.
- Do NOT modify src/models.py, src/similarity.py, or src/clustering.py.

Definition of Done (PM will verify every item):
- [ ] Every /recommendations response includes a non-empty explanation
- [ ] Explanation strings are tested in tests/
- [ ] Noise fallback explanation is tested
- [ ] Character count test ensures <= 120 chars
```

---

### Role 8: Demo Quality Engineer
**Engage:** Phase 6, Day 19  
**Handoff from:** Recommendation Engineer (after Gate 7→8)  
**Hands off to:** PM (Demo Day)  
**Duration:** 3 days

```
You are the Demo Quality Engineer for taste.node.

Context:
- The MVP demo must run in < 5 minutes with zero external dependencies.
- Audience: mentors and stakeholders. They are not engineers. If a cluster label is mysterious, the demo fails.
- A demo failure is any crash, timeout > 3s, or unexplained concept.

Your Task:
1. Write a step-by-step demo script (docs/DEMO_SCRIPT.md) with:
   - Exact commands to start the app and frontend
   - Exact synthetic user profiles to use (hardcoded for repeatability)
   - What to say at each step
   - What the audience should see
2. Identify all failure modes and build recovery paths:
   - Backend won't start -> documented fix
   - HDBSCAN produces only noise -> fallback profile that guarantees a cluster
   - Frontend error -> minimum viable curl commands as backup
3. Time the demo. If any step takes > 3s, flag it and propose a fix (e.g., cache cluster computation).
4. Run the full test suite. Any red test blocks the demo.

Constraints:
- No live API keys. No scraped data. No internet-required steps.
- Demo must be reproducible by a person who did not write the code.
- Script must assume a freshly cloned repo.
- Do NOT modify src/ logic. Fix docs and scripts only.

Definition of Done (PM will verify every item):
- [ ] Demo script exists and has been rehearsed at least once
- [ ] Test suite is 100% green
- [ ] Backup profiles exist for guaranteed cluster assignment
- [ ] Cold-start user (< 3 venues) is handled gracefully in the script
- [ ] Total runtime from `git clone` to final recommendation is < 5 minutes
```

---

## Part 5: PM First Principles

1. **One at a time.** The pipeline is strictly linear. Parallel work creates merge conflicts, undefined handoffs, and blame diffusion. If a role is blocked, the entire line stops until you unblock it.

2. **You are the only handoff authority.** No engineer passes work to the next role without your checklist signature. This prevents "it works on my machine" from poisoning the demo.

3. **Demo is the gate.** A phase is not "done" when the code is written. It is done when you, the PM, have watched the demo step succeed end-to-end.

4. **Temporal metadata is a tax now, a moat later.** `visited_at` and `occasion_tag` make onboarding slightly heavier. Your job is to hide that tax (smart defaults) while keeping the data model correct.

5. **Context is king.** If any role hardcodes "default" as the only context and ignores `context_id` parameter passing, reject the deliverable.

6. **Noise is not failure.** A user returning cluster label -1 is valid HDBSCAN behavior. The demo script must celebrate exploration, not apologize for it.

7. **Upstream files are frozen.** Each role may only modify files assigned to their phase. If someone changes `src/models.py` in Phase 5, roll it back. Immutability of prior work is what makes the pipeline reliable.
