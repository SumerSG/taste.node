# Prompt: PM MVP Phase Planning for taste.node

## Your Role
You are the **Founding Product Manager** for `taste.node`. You do not write code, but you own the sequence, priority, and definition of "done" for every slice of work between now and the first MVP demo.

The architecture is locked across four pillars. Every phase you design must respect them:

1. **HDBSCAN** clustering on normalized Kendall Tau distances (non-Euclidean, noise-aware).
2. **Temporal RankedItem** metadata (`visited_at`, `occasion_tag`, derived rank with time-decay).
3. **Contextual TasteProfiles** (`context_id` is first-class; no global lists).
4. **Synthetic-only** seed data for demo; production data gated to documented public APIs only.

## Your Task
Produce a **MVP Development Roadmap** that breaks the path from today to a working, demoable product into concrete phases. Each phase must have a single, falsifiable goal. No phase should contain more than one major architectural risk.

## Constraints
- The first MVP is a **single-context demo**. Do not require multi-context switching in the critical path.
- The demo audience is mentors and stakeholders. It must run in < 5 minutes with zero external dependencies (no API keys, no scraped data).
- Temporal metadata (`visited_at`, `occasion_tag`) must be **captured** in the data model from day one, even if the UI does not surface time-decay in the first demo.
- Clustering must be **explainable** in one sentence during the demo. A black-box cluster label is not acceptable.
- Recommendations must include a **one-sentence explanation** tied to the cluster.

## Output Structure

### Part 1: MVP Definition
Define the narrowest possible MVP that still proves the core hypothesis:
- What is the core hypothesis in one sentence?
- What is the single user story the demo walks through?
- What is explicitly out of scope for the MVP?

### Part 2: Phase Breakdown
For each phase, provide:

| Field | Description |
|-------|-------------|
| **Phase Name** | e.g., "Phase 0: Synthetic Data + API Shell" |
| **Duration** | e.g., "Days 1-3" or "Week 1" |
| **Goal** | One falsifiable sentence. If this is not true, the phase is not done. |
| **Key Deliverables** | Bulleted list of concrete outputs (code, data, docs, UI). |
| **Dependencies** | What must be true before this phase starts? |
| **Risks & Mitigations** | What could kill this phase, and what is the fallback? |
| **Definition of Done** | Checklist. Every item must be verifiable by someone who did not write the code. |
| **Demoability** | What part of this phase, if any, can be shown to a stakeholder? |

**Suggested phases (redesign if you disagree):**
- Phase 0: Synthetic dataset + deterministic clustering
- Phase 1: Similarity engine + API endpoints
- Phase 2: Contextual data model + onboarding flow
- Phase 3: Recommendation engine + explanations
- Phase 4: UI + end-to-end demo rehearsal

### Part 3: Data Model Sequencing
Taste.node's data model is its most complex surface. Map when each field is introduced:

| Field | Introduced In | Why Then? |
|-------|---------------|-----------|
| `Venue.id` | Phase 0 | ... |
| `RankedItem.visited_at` | Phase 0 | ... |
| `RankedItem.occasion_tag` | Phase 1 | ... |
| `TasteContext.context_id` | Phase 1 | ... |
| `TasteProfile.default_context` | Phase 1 | ... |
| `compute_derived_rank` | Phase 2 | ... |
| Time-decay weights in similarity | Phase 2 | ... |
| Contextual cluster map | Phase 2 | ... |
| Explanation generator | Phase 3 | ... |

### Part 4: Decision Log
For every major architectural or product decision the PM must make, list:
- The decision
- The options considered
- The chosen option
- The reversible date (when does this decision ossify?)

Examples:
- "Do we expose the cluster label to the user or hide it?"
- "Do we support re-ranking existing venues in the first demo?"
- "Do we allow batch-import of a ranked list, or force sequential entry?"

### Part 5: Risk Register (Top 5)
Rank the top 5 risks to shipping the MVP on time, with owner and contingency.

| Rank | Risk | Probability | Impact | Owner | Contingency |
|------|------|-------------|--------|-------|-------------|
| 1 | HDBSCAN clustering is unexplainable in demo | Medium | High | PM | ... |
| 2 | Synthetic data does not produce visually coherent clusters | Medium | High | Tech Lead | ... |
| 3 | UI scope creep: team wants filters before clustering works | High | Medium | PM | ... |
| 4 | Temporal metadata capture adds onboarding friction | Medium | Medium | Design | ... |
| 5 | Explanation generator produces nonsensical sentences | Low | Medium | Tech Lead | ... |

## Deliverable
A single markdown document (`MVP_ROADMAP.md`) stored in `docs/`, containing all five parts above.

## Tone
- Ruthless about scope. If a feature does not directly help the demo prove the hypothesis, it is P2 or cut.
- Specific about handoffs. The PM's job is to make the boundary between phases crisp.
- No jargon without translation. A mentor reading this doc should understand why each phase exists.
