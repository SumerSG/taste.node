# PM Orchestration Guide: taste.node MVP

> **How to use this document:**
> You are the Founding PM. The goal is a working, demoable MVP of taste.node. This guide tells you **which role to hire (or prompt) at which phase**, and exactly **what to tell them**. Each role prompt is self-contained and assumes only the prior phases have shipped.

---

## Part 1: MVP Phase Plan

| Phase | Name | Duration | Goal | Primary Output |
|---|---|---|---|---|
| 0 | Foundation | Days 1-3 | Deterministic synthetic dataset produces coherent HDBSCAN clusters. | `synthetic_data.py` + demo script |
| 1 | Core Engine | Days 4-7 | Contextual Kendall similarity + HDBSCAN clustering fit end-to-end. | `similarity.py` + `clustering.py` + tests |
| 2 | API Shell | Days 8-10 | FastAPI exposes contextual endpoints for similarity, cluster assignment, and recommendations. | `main.py` + testable API |
| 3 | Onboarding UX | Days 11-14 | User can create a TasteProfile with temporal metadata and see their cluster label. | Frontend + POST endpoints |
| 4 | Explainability | Days 15-18 | Recommendations include one-sentence cluster-based explanations. | `recommendations` enrichment + UI |
| 5 | Demo Lock | Days 19-21 | End-to-end demo rehearsed; no scope creep; all tests green. | Demo script + stability |

> **Hypothesis to prove:** *Two people with similar contextual restaurant rankings are better matched by density-based clustering than by star ratings.*

**Out of scope for MVP:**
- Public API integration (Yelp/Google)
- Multi-context switching UI
- Social/group dining features
- Time-decay visualizations in UI (data is captured; not surfaced)
- Real-time cluster recalculation triggers

---

## Part 2: PM Orchestration Table

| Phase | Role to Engage | What You Need From Them | Their Input Enables... |
|---|---|---|---|
| 0 | **Synthetic Data Engineer** | Persona-biased dataset with realistic clusterability | Phase 1 clustering validation |
| 1 | **Taste Similarity Engineer** | Normalized Kendall Tau distance with temporal weighting | Phase 2 HDBSCAN + API |
| 1 | **HDBSCAN Clustering Engineer** | Non-Euclidean clustering pipeline with noise handling | Phase 2 API endpoints |
| 2 | **Contextual API Engineer** | FastAPI endpoints that treat `context_id` as first-class | Phase 3 frontend integration |
| 3 | **Temporal Data Model Designer** | Onboarding flow that captures `visited_at` and `occasion_tag` | Phase 4 explainability |
| 3 | **Taste-Focused Frontend Engineer** | UI where user builds a ranked list and sees cluster label | Phase 4 recommendation surfacing |
| 4 | **Recommendation Engineer** | Cluster-affinity scoring + one-sentence explanation generator | Phase 5 demo value prop |
| 5 | **Demo Quality Engineer** | Rehearsal scripts, failure recovery, timeout guards | Demo day success |

**Hiring Rule:** Do not hire Phase N+1 roles until Phase N has a green test suite and a verbal demo to you. The PM's job is to gate the pipeline.

---

## Part 3: Role Prompt Library

Give the role prompt below to the person (or agent) you engage. Each prompt assumes all prior phases are complete.

---

### Role 1: Synthetic Data Engineer
**Engage:** Phase 0, Day 1
**Deliver to:** Phase 1 (Taste Similarity Engineer + HDBSCAN Clustering Engineer)

```
You are the Synthetic Data Engineer for taste.node.

Context:
- taste.node is a contextual taste-matching platform. Users rank restaurants within contexts like 'solo', 'date', 'business'.
- We need a fully synthetic, deterministic dataset to validate clustering before any real users onboard.
- Architecture uses HDBSCAN on normalized Kendall Tau distances. Clusters must be non-spherical, density-based.
- Temporal metadata matters: RankedItem has visited_at and occasion_tag. rank is derived from list order.

Your Task:
1. Design a persona taxonomy (e.g., 'ramen_lover', 'michelin_chaser', 'casual_explorer') with distinct venue affinities.
2. Generate N=50-100 synthetic TasteProfiles, each with 1-3 contexts. Personas must produce visually separable clusters when run through HDBSCAN.
3. Ensure visited_at dates are varied (not all today) so temporal decay is testable.
4. Export deterministic output: seed must be configurable; same seed = identical dataset.
5. Provide a validation script: run HDBSCAN on your data and report silhouette score and cluster count.

Constraints:
- No production data. No scrapers. No real venue names.
- Venue names can be synthetic (e.g., "Golden Bistro 12").
- Default context ('default') must exist on every profile.
- Code goes in src/synthetic_data.py.

Definition of Done:
- [ ] Script runs with `python src/synthetic_data.py --n 100 --seed 42`
- [ ] Output is deterministic (md5sum matches across runs)
- [ ] A test in tests/test_synthetic_data.py verifies deterministic output
- [ ] Persona bias test: at least one persona produces distinct top venues
- [ ] Validation script reports >= 3 clusters and silhouette > 0.3
```

---

### Role 2: Taste Similarity Engineer
**Engage:** Phase 1, Day 4
**Handoff from:** Synthetic Data Engineer
**Deliver to:** Contextual API Engineer

```
You are the Taste Similarity Engineer for taste.node.

Context:
- Users have contextual taste profiles. Similarity must be computed within a single context.
- The metric is normalized Kendall Tau distance: distance = (1 - tau) / 2, giving [0, 1].
- NaN or missing overlap must return None (distinguish "no data" from "total disagreement").
- Temporal decay: a shared venue visited 2 years ago should weigh less than one visited 2 weeks ago, unless tagged 'classic'.

Your Task:
1. Implement kendall_distance(a: TasteProfile, b: TasteProfile, context_id: Optional[str]) in src/similarity.py.
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

Definition of Done:
- [ ] pytest tests/test_similarity.py passes 100%
- [ ] No overlap returns None (not 0.0)
- [ ] Temporal weights are computed and can be logged for debugging
- [ ] Distance output is in [0, 1]
```

---

### Role 3: HDBSCAN Clustering Engineer
**Engage:** Phase 1, Day 4 (parallel with Role 2)
**Handoff from:** Synthetic Data Engineer
**Deliver to:** Contextual API Engineer

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
- min_cluster_size must be configurable and tested
- Do NOT implement K-Means. Any alternative to HDBSCAN needs PM sign-off.
- Code goes in src/clustering.py.

Definition of Done:
- [ ] pytest tests/test_clustering.py passes 100%
- [ ] HDBSCAN is the only clustering algorithm shipped
- [ ] Noise labels (-1) are tested and valid
- [ ] ContextualClusterMap can fit multiple contexts independently
```

---

### Role 4: Contextual API Engineer
**Engage:** Phase 2, Day 8
**Handoff from:** Taste Similarity Engineer + HDBSCAN Clustering Engineer
**Deliver to:** Temporal Data Model Designer + Taste-Focused Frontend Engineer

```
You are the Contextual API Engineer for taste.node.

Context:
- taste.node exposes a FastAPI service. Every endpoint that touches taste data must accept an optional context_id.
- The synthetic dataset is loaded in-memory for the MVP (no persistent DB yet).
- Endpoints needed: health check, similarity, cluster assignment, recommendations.

Your Task:
1. Update src/main.py with endpoints:
   - POST /similarity: accepts two TasteProfiles + optional context_id. Returns similarity, distance, shared count, interpretation string.
   - POST /cluster/assign: accepts one TasteProfile + optional context_id. Returns cluster label (or -1 for noise) with status.
   - POST /recommendations: accepts one TasteProfile + optional context_id + n (count). Returns top N venues with cluster label attached.
2. Interpretation strings must be human-readable (e.g., "no overlap", "strong similarity", "noise (outlier)").
3. If context_id is omitted, fall back to profile.default_context.
4. Recommendations should:
   - Pull candidate venues from users in the same cluster for that context
   - Exclude venues already in the requester's list
   - Sort by derived rank (time-decayed)
   - Handle noise users by falling back to popularity across all profiles
5. Wire the synthetic dataset as the in-memory seed store.

Constraints:
- Do not add persistent DB logic for MVP. In-memory dict is fine.
- Do not expose raw vectors or internal distance matrices to the client.
- All Pydantic models must match src/models.py exactly.

Definition of Done:
- [ ] API starts with `uvicorn src.main:app --reload` without errors
- [ ] POST /similarity with two synthetic profiles returns a score in [0, 1] or null
- [ ] POST /recommendations returns top N venues with venue model_dump()
- [ ] All endpoints accept an optional ?context_id query parameter
- [ ] Health check returns {"status": "ok"}
```

---

### Role 5: Temporal Data Model Designer
**Engage:** Phase 3, Day 11
**Handoff from:** Contextual API Engineer
**Deliver to:** Taste-Focused Frontend Engineer

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

Definition of Done:
- [ ] Data model spec documented in docs/DATA_CONTRACT.md
- [ ] JSON request shapes are copy-pasteable for frontend integration
- [ ] Default values are specified for every optional field
- [ ] Edge cases are handled (missing context_id, unknown venue_id, duplicate venue in same context)
```

---

### Role 6: Taste-Focused Frontend Engineer
**Engage:** Phase 3, Day 11 (parallel with Role 5)
**Handoff from:** Contextual API Engineer
**Deliver to:** Recommendation Engineer

```
You are the Taste-Focused Frontend Engineer for taste.node.

Context:
- The MVP frontend must let a user create a ranked list of venues and see their cluster label.
- This is not a generic CRUD app. The product sells "your taste is contextual and evolving." The UI should feel like ranking, not like filling a form.
- Backend endpoints exist at POST /similarity, /cluster/assign, /recommendations.

Your Task:
1. Build a minimal web UI (Streamlit or a single-page React app) with three screens:
   - **Screen 1: Onboarding** — User enters user_id and builds their first ranked list. Drag-and-drop or sequential entry is acceptable. Hidden fields: visited_at defaults to now, occasion_tag defaults to "solo".
   - **Screen 2: Cluster Result** — Shows the user's cluster label after POST /cluster/assign. If noise (-1), show a friendly message: "You're still exploring — add more venues to unlock your taste cluster."
   - **Screen 3: Recommendations** — Shows top 5 recommended venues with a one-line placeholder explanation.
2. The UI must call the FastAPI backend. Use the existing Pydantic models as the JSON contract.
3. Handle errors gracefully (backend down, noise user, empty list).

Constraints:
- Keep it demo-friendly (readable on a projector, no tiny text).
- Do not build multi-context switching UI for MVP. Default context only.
- Do not build login/auth. A text input for user_id is fine.
- Focus on the single user story: create list -> see cluster -> get recs.

Definition of Done:
- [ ] A neutral user can onboard, get a cluster label, and see recommendations in < 2 minutes
- [ ] Demo runs entirely locally with `uvicorn src.main:app` + frontend dev server
- [ ] Noise users get a graceful fallback message
- [ ] UI text is large enough for a screen-share demo
```

---

### Role 7: Recommendation Engineer
**Engage:** Phase 4, Day 15
**Handoff from:** Taste-Focused Frontend Engineer
**Deliver to:** Demo Quality Engineer

```
You are the Recommendation Engineer for taste.node.

Context:
- The demo must prove value in one sentence. Every recommendation needs a human-readable explanation tied to the cluster.
- Recommendations are contextual and cluster-based. We do not have real venue metadata yet (cuisines, dietary tags), so the explanation must rely on cluster membership alone.
- The MVP uses the synthetic dataset, so explanations will reference other synthetic users. That is acceptable for the demo as long as it validates the mechanism.

Your Task:
1. Enrich the POST /recommendations endpoint so every returned recommendation includes:
   - venue: the venue object
   - explanation: a one-sentence string
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

Definition of Done:
- [ ] Every /recommendations response includes a non-empty explanation
- [ ] Explanation strings are tested in tests/
- [ ] Noise fallback explanation is tested
- [ ] Character count test ensures <= 120 chars
```

---

### Role 8: Demo Quality Engineer
**Engage:** Phase 5, Day 19
**Handoff from:** Everyone
**Deliver to:** Founding PM (you)

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

Definition of Done:
- [ ] Demo script exists and has been rehearsed at least once
- [ ] Test suite is 100% green
- [ ] Backup profiles exist for guaranteed cluster assignment
- [ ] Cold-start user (< 3 venues) is handled gracefully in the script
- [ ] Total runtime from `git clone` to final recommendation is < 5 minutes
```

---

## Part 4: Hiring Priority Matrix

| Phase | Role | Engage Immediately After | Urgency | Risk if Delayed |
|---|---|---|---|---|
| 0 | Synthetic Data Engineer | PM kickoff | CRITICAL | No data = no clustering = no demo |
| 1 | Taste Similarity Engineer | Role 1 complete | CRITICAL | Similarity is the core algorithm |
| 1 | HDBSCAN Clustering Engineer | Role 1 complete | CRITICAL | Without clustering, no taste groups |
| 2 | Contextual API Engineer | Roles 2+3 green tests | HIGH | API is the bridge to frontend |
| 3 | Temporal Data Model Designer | Role 4 API stable | HIGH | Wrong data model poisons all downstream work |
| 3 | Taste-Focused Frontend Engineer | Role 4 API stable | HIGH | No UI = no demo |
| 4 | Recommendation Engineer | Role 6 UI functional | MEDIUM | Value prop is not proven without explanations |
| 5 | Demo Quality Engineer | All roles done | MEDIUM | Bad demo kills a good product |

---

## Part 5: First Principles for the PM

1. **Parallelize with caution.** Roles 2 and 3 can run in parallel because they touch different files (`similarity.py` vs `clustering.py`). Roles 5 and 6 MUST be sequential because Role 5 defines the contract Role 6 consumes.

2. **Demo is the gate.** A phase is not "done" when the code is written. It is done when you, the PM, have watched the demo step succeed end-to-end.

3. **Temporal metadata is a tax now, a moat later.** `visited_at` and `occasion_tag` make onboarding slightly heavier. The PM's job is to hide that tax (smart defaults) while keeping the data model correct.

4. **Context is king.** If any role hardcodes "default" as the only context and ignores `context_id` parameter passing, reject the deliverable.

5. **Noise is not failure.** A user returning cluster label -1 is valid HDBSCAN behavior. The demo script must celebrate exploration, not apologize for it.
