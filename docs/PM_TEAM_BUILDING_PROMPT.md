# Prompt: PM Team-Building Exercise for taste.node

## Your Role
You are the **Founding Product Manager** for `taste.node`. The architecture is now locked across four pillars:

1. **HDBSCAN** clustering on normalized Kendall Tau distances (non-Euclidean, noise-aware).
2. **Temporal RankedItem** metadata (`visited_at`, `occasion_tag`, derived rank with time-decay).
3. **Contextual TasteProfiles** (`context_id` is first-class; no global lists).
4. **Synthetic-only** seed data for demo; production data gated to documented public APIs only.

## Your Task
Produce a **cross-phase staffing blueprint** that maps every functional workstream to the right role at the right time. Do not produce generic advice. Ground every recommendation in the specific risks, dependencies, and skill gaps of the taste.node architecture above.

## Output Structure

### Phase 1: Demo & Architecture Validation (0-8 weeks)
- **Goal:** Working end-to-end demo with synthetic data. Validate clustering coherence and API surface.
- **Team Size Target:** 3-5 people.
- **Questions to Answer:**
  - What specific combination of backend, ML, and data skills is needed to get HDBSCAN + FastAPI working reliably on the temporal model?
  - Who owns the PRNG synthetic-data generator and ensures its statistical realism?
  - Do we need a dedicated data scientist, or can clustering be owned by a senior backend engineer with scipy/hdbscan fluency?
  - What is the minimum viable frontend role? (Streamlit vs React — who decides and builds?)

### Phase 2: Private Beta & First Real Users (2-4 months post-demo)
- **Goal:** Onboard 50-200 real users; replace synthetic clusters with real taste profiles; integrate one public API (Yelp Fusion or Google Places).
- **Team Size Target:** 5-8 people.
- **Questions to Answer:**
  - Who owns API partnership contracts, rate-limiting, and attribution compliance?
  - Taste is contextual — what role ensures we capture `occasion_tag` and `visited_at` correctly in onboarding UX?
  - HDBSCAN is compute-heavy on pairwise matrices. At what user count do we need an ML engineer to optimize the similarity pipeline?
  - The temporal model means recency, fatigue, and memory decay matter. Who designs the UX that communicates "your taste evolves" without confusing the user?

### Phase 3: Scale & Diversification (6-12 months)
- **Goal:** 10K+ users; real-time contextual clusters; group/social dining features.
- **Team Size Target:** 10-20 people.
- **Questions to Answer:**
  - When do we need a dedicated **Taste Science / Applied Research** role to refine the similarity metric beyond Kendall Tau?
  - Contextual clustering means cluster maps per context. Who owns the infrastructure to compute and cache cluster assignments across contexts in <500ms?
  - The `occasion_tag` taxonomy will expand (`mood_tags`, `group_size`, `weather`). Who owns the ontology? A product data analyst? A taste ethnographer?
  - Group recommendations require intersecting dietary constraints across contexts. What backend/infra role ships this?

### Phase 4: Platform & Ecosystem (12+ months)
- **Goal:** Taste clusters as a platform layer; B2B partnerships (reservation apps, delivery platforms).
- **Team Size Target:** 20+ people.
- **Questions to Answer:**
  - What role protects the privacy of cluster membership when selling taste insights as a data product?
  - Who manages the ethical boundary between personalization and manipulation (dopamine loops, filter bubbles)?
  - As contexts multiply (work lunch, vacation, family dinner), who ensures the taste model stays tractable?

## Role Definition Template (One Per Role You Propose)
For each role, provide:

| Field | Content |
|-------|---------|
| **Title** | e.g., "Taste Infrastructure Engineer" |
| **Phase Introduced** | e.g., "Phase 1, Week 3" |
| **Reports To** | e.g., "Founding Engineer (Phase 1); ML Lead (Phase 3)" |
| **Core Responsibility** | One sentence tied to taste.node architecture |
| **Must-Have Skills** | Specific tools/methodologies |
| **Nice-to-Have** | Domain knowledge that accelerates this product |
| **MVP Task** | The first deliverable they own |
| **Success Metric** | What "done" looks like for their first 90 days |
| **Risk If Missing** | Why taste.node fails without this role at this time |

## Constraints
- Do not recommend a "Data Engineer / ML Engineer" generic bundle. Be specific: are they building the HDBSCAN pipeline, the API integration, or the feature store?
- Do not ignore the temporal/contextual complexity. A standard recsys engineer is insufficient.
- Scoring is not a generic ML problem — it is a **contextual taste similarity** problem. Prioritize people who understand rank correlation, density-based clustering, and time-decay weighting.
- Frontend roles must understand that the product sells "evolving taste," not static ratings.

## Deliverable
A single markdown document (`TEAM_ROADMAP.md`) containing:
1. Phase-by-phase org chart (text is fine).
2. Per-role definitions using the template above.
3. A single-page "Hiring Priority Matrix" (Phase × Role × Urgency).
4. A note on **first hire**: who should be employee #2 after the founding engineer/PM, and why.
