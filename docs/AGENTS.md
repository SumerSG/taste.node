# taste.node — Supreme Architectural Constraints

| | |
|:---|:---|
| **Status** | Immutable Reference |
| **Authority** | Overrides all downstream planning documents (`PRD`, `TDD`, `MILESTONES`, `CLUSTER_ARCHITECTURE`) in case of conflict. |
| **Ratified** | 2026-06-22 |
| **Source** | Derived from internal architectural review and codified as the formal docs-folder constraint. |

---

## Pillar 1: Correct the Clustering Algorithm

**The Problem:** Early designs used K-Means on a pairwise distance matrix. K-Means assumes Euclidean space and Gaussian blobs. Taste clusters are not spherical (e.g., "Burger lovers" vs. "Michelin chasers").

**The Fix:**
- **Locked algorithm:** `hdbscan.HDBSCAN(metric='precomputed', min_cluster_size=5, allow_single_cluster=False)`.
- **Distance metric:** Normalized Kendall Tau distance: `(1 - tau.correlation) / 2`.
- **No-overlap handling:** Distinguish **"No overlap"** (no shared venues → insufficient data, sentinel `-1.0`) from **"Total disagreement"** (inverse ranking → strong negative signal, distance `1.0`).
- **Forbidden:** `sklearn.cluster.KMeans`, Agglomerative Hierarchical Clustering as primary, DBSCAN as primary, or any algorithm assuming Euclidean/Gaussian geometry.

**Architectural Implication:** All clustering logic, schemas, and API design must reflect HDBSCAN. Any alternative algorithm must be explicitly justified against HDBSCAN in a design-review amendment to this document.

---

## Pillar 2: Enrich RankedItem with Temporal Metadata

**The Problem:** Static models treat taste as stable property, ignoring taste adaptation, memory decay, and biological variance.

**The Fix:**
- `RankedItem` must carry `visited_at` (biological reality), `added_at` (system audit), and `occasion_tag` (social context).
- `rank` is a **derived snapshot**, never a raw stored integer. It is exposed as a `@computed_field` + `@property` with **zero arguments** other than `self`, returning `float`.
- Similarity functions must support **time-decay weighting**: a visit from two weeks ago weighs more than one from two years ago, unless `is_classic: bool = True`.

**Architectural Implication:** All future data models, ingestion flows, and similarity calculations must support this temporal structure. Storing `rank` as a raw integer in the database violates this pillar.

---

## Pillar 3: Replace Global Ranked List with Contextual Taste Profiles

**The Problem:** A single global `ranked_list` is solipsistic; taste shifts by social context and biological state.

**The Fix:**
- Core abstraction:
  ```python
  class TasteContext(BaseModel):
      context_id: str
      ranked_list: List[RankedItem]
      created_at: datetime
      updated_at: datetime

  class TasteProfile(BaseModel):
      user_id: str
      contexts: Dict[str, TasteContext]
      default_context: str = "default"
  ```
- `context_id` is a **first-class citizen** in every layer: data model, similarity API, clustering engine, and recommendation pipeline.
- **Engine Layer Mandatory Rule:** In `src/similarity.py`, `src/clustering.py`, and `src/recommendations.py`, `context_id` is a **mandatory** `str` parameter. Any function signature omitting it or typing it as `Optional` / `str | None` is architecturally invalid.
- **API Layer Optional Rule:** FastAPI endpoints may accept `context_id` as an **optional query parameter**, falling back to `TasteProfile.default_context` when omitted. This does not violate the Engine Layer rule because the route handler resolves the fallback before calling engine functions.

**Architectural Implication:** Similarity and clustering are computed **per-context**. A user may be in cluster A for `date_night` and cluster B for `business_lunch`. Cross-context mixing is forbidden.

---

## Pillar 4: Production Persistence via Supabase Postgres

**The Problem:** MVP used a local SQLite file. This fails in containerized deployment (Build.io dynos are ephemeral, so data is lost on deploy), prevents multi-device usage, and cannot support social features.

**The Fix:**
- **Supabase Postgres** is the production persistence layer. Backend uses `supabase-py` client with `SUPABASE_SERVICE_KEY` (server-side only, never exposed to the browser).
- **Row Level Security (RLS):** All user-data tables have RLS policies enforcing that `auth.uid() = user_id`. See `supabase/000_complete_schema.sql` for full policies.
- **Auth:** Supabase Auth handles Google OAuth and email/password. JWT sessions are managed by `@supabase/supabase-js` `gotrue` client on the frontend.
- **Tables:** `profiles`, `contexts`, `ranked_items`, `venues`, `feed_posts`, `follows`. Created via migration `002_full_schema.sql`.
- **Fallback:** When `SUPABASE_URL` or `SUPABASE_SERVICE_KEY` is missing (local dev), backend falls back to the existing SQLite + SQLAlchemy path. No env var = SQLite. Both paths share the same `src/db.py` public API so route code is unchanged.
- **RLS bypass for seed scripts:** Service role key bypasses RLS; seed scripts use `TO service_role` policies (see `supabase/000_complete_schema.sql`).

**Architectural Implication:** Backend route handlers never change persistence technology. They call functions in `src/db.py` which are conditionally re-exported to `src/supabase_db.py` when Supabase env vars are present. All tests use SQLite (no env vars set). Production uses Supabase. Both pass identical tests.

### Pillar 4.1: Scraping is Internal-Demo-Only

**Policy:**
1. **MVP (Development & Internal Demo):** Use a **fully synthetic dataset** bootstrapped by a seeded PRNG script.
2. **Production:** Only integrate real data through **documented public APIs** (e.g., Yelp Fusion, Google Places).
3. **Scraping public rating pages** (e.g., scraping Yelp HTML) is **explicitly out of scope** for the MVP.

**Architectural Implication:** No production scrapers. No `BeautifulSoup`, `Scrapy`, or raw HTML parsing in dependencies.

All rejected tools — including K-Means, AHC, Spectral Clustering, silhouette analysis, vector databases (Pinecone, Weaviate, pgvector), and scraping tools — are formally documented in `docs/ADR-001_REJECTED_TOOLS.md`. This ADR is an immutable dependency of `AGENTS.md`.

---

## Dispute Resolution

If a downstream document (`TDD`, `PRD`, `MILESTONES`, `CLUSTER_ARCHITECTURE`) contradicts this file:
1. `AGENTS.md` wins.
2. The contradiction must be logged in `docs/planning_audit_and_prompt_report.md`.
3. A PR must be opened to align the downstream document before any code is written against the conflicting text.

---

*This document is immutable. Amendments require a unanimous mentor sign-off and a version bump in `TDD.md`.*
