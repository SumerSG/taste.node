# Technical Design Document (TDD) — taste.node v0.1

| | |
|:---|:---|
| **Status** | 🟡 Draft / Planning — decisions pending mentor review |
| **Author** | Sumer Gaikwad |
| **Date** | 2026-06-19 |
| **Depends on** | PRD v0.1 |

---

## 1. System Overview

taste.node is a web application with three conceptual layers:
1. **Taste Layer:** Ingests and compares ranked lists.
2. **Cluster Layer:** Groups users by taste similarity; bootstrapped with synthetic seed data.
3. **Recs Layer:** Applies live filters to cluster preferences and returns explainable suggestions.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│   API Server     │────▶│   ML / Cluster  │
│  (ranked list,  │     │  (FastAPI /      │     │  (Python,       │
│   filters)      │◀────│   Node/Express)  │◀────│   scikit-learn) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  User DB        │     │  Venue DB        │
│  (ranked lists, │     │  (metadata,      │
│   profiles)     │     │   tags, coords)  │
└─────────────────┘     └──────────────────┘
```

## 2. Data Model

### 2.1 User
```json
{
  "id": "uuid",
  "created_at": "iso8601",
  "cluster_id": "cluster_7",
  "ranked_list": [
    {"venue_id": "v_101", "rank": 1, "added_at": "..."},
    {"venue_id": "v_042", "rank": 2, "added_at": "..."}
  ]
}
```

### 2.2 Venue
```json
{
  "id": "uuid",
  "name": "Burger Joint",
  "location": {"lat": 51.5, "lng": -0.1},
  "cuisines": ["Burger", "American"],
  "dietary_tags": ["Meat", "Vegetarian-option"],
  "price_tier": 2,
  "health_score": 3.2,
  "source": "synthetic" | "api" | "user_added"
}
```

### 2.3 Cluster (Runtime)
```json
{
  "id": "cluster_7",
  "centroid": [/* embedding vector */],
  "member_ids": ["u_1", "u_2", ...],
  "top_venues": ["v_101", "v_042"],
  "updated_at": "iso8601"
}
```

## 3. API Surface (Draft)

These are the endpoints we expect to need. Exact shapes will evolve.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users` | Create user |
| `GET`  | `/users/{id}` | Get user + ranked list + cluster |
| `PUT`  | `/users/{id}/ranked-list` | Update ranked list (re-order or insert) |
| `POST` | `/clusters/recalculate` | Trigger cluster rebuild (async) |
| `GET`  | `/recommendations?user={id}&lat=...&lng=...&cuisine=...&diet=...` | Get filtered recs + explanations |
| `GET`  | `/venues/search?q=...` | Fuzzy venue search for list input |

## 4. Algorithm Design

### 4.1 Similarity Metric

**Candidate 1: Kendall Tau Distance**
- Measures ordinal correlation between two ranked lists.
- Handles partial overlap (only venues in common count).
- Fast enough for 1,000 users.

**Candidate 2: Jaccard + Rank Weighting**
- Jaccard for set overlap, multiplied by a rank-weighted factor.
- Simpler to explain; sacrifices some nuance.

**Candidate 3: Embedding-based**
- Encode each venue into an embedding (cuisine, price, tags).
- User embedding = weighted average of venue embeddings in their list.
- Cosine similarity between user embeddings.
- Risk: loses the *ranked* signal.

**Recommendation:** Start with **Kendall Tau** (FR-3 is a P0 and this is the canonical metric for ranked lists). Experiment with hybrid if results are weak.

### 4.2 Clustering Algorithm

**Primary: K-Means on pairwise similarity matrix**
- Build N×N similarity matrix from Kendall Tau.
- Run K-Means or Hierarchical Clustering.
- Number of clusters K determined by elbow method or silhouette analysis on seed data.

**Fallback: DBSCAN**
- If clusters are non-spherical or noisy.
- Requires tuning `eps`; harder to explain during demo.

### 4.3 Recommendation Scoring

For a given user `u` with active filters `F`:

```
score(venue) = α · cluster_affinity(venue, cluster(u))
             + β · filter_match(venue, F)
```

Where:
- `cluster_affinity` = mean rank of venue within cluster members’ lists (inverted: lower rank = higher score).
- `filter_match` = binary or weighted match against active filters.
- `α + β = 1.0` (start with 0.6 / 0.4 and tune).

### 4.4 Explanation Generation

Template-based, data-populated:

> *"{N} people in your taste cluster ranked this in their top {K} after visiting {reference_venue}."*

Fallback if no cluster match:

> *"This matches your filters and is trending nearby."*

## 5. Seed Data Pipeline

```
[Synthetic Generator] → [User Profiles]
    → [Deduplicator] → [Normaliser] → [Seed DB]
    → [Cluster Trainer] → [Initial Clusters]
```

- **Generator:** Deterministic PRNG script (`src/synthetic_data.py`).
- **Constraints:** Fully synthetic. No legal risk. Reproducible with fixed seed.
- **Output:** JSON lines of `{user_alias, ranked_venue_ids[]}`.
- **Validation:** 80/20 split. Train clusters on 80%, test coherence on 20%.
- **Production:** Only integrate real data via documented public APIs with attribution.

## 6. Tech Stack (Proposed)

| Layer | Choice | Rationale | Decision Status |
|-------|--------|-----------|---------------|
| Language | Python 3.12 | ML ecosystem, fast prototyping | 🟡 Pending approval |
| API Framework | FastAPI | Async, auto-docs, type hints | 🟡 Pending |
| Frontend | Next.js (React) or Streamlit | Next.js if we want polish; Streamlit if speed matters | 🟡 Pending |
| ML Libraries | scikit-learn, scipy | Kendall tau, K-Means, silhouette | 🟡 Pending |
| Database | SQLite (MVP) or PostgreSQL | SQLite for demo simplicity; Postgres if multi-user demo | 🟡 Pending |
| Synthetic Data | src/synthetic_data.py | Deterministic, legal-safe seed dataset | ✅ Locked |
| Deployment | Render / Vercel / Heroku | Free tier, quick setup | 🟡 Pending |

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Public API rate limits or access | High | Use synthetic dataset for all demos and testing; gate production APIs behind attribution and rate-limiting |
| Kendall Tau too slow at scale | Medium | Cache similarity matrix; use approximate methods if needed (scale is small for demo) |
| Clusters are uninterpretable | High | Visualise with t-SNE/PCA; keep K small for demo (5–7 clusters) |
| Live filters return zero results | Medium | Fallback: relax least-important filter first; explain fallback to user |
| Frontend complexity eats build time | High | Streamlit as plan B if Next.js slips |

## 8. Decisions Pending

1. Similarity metric (Kendall Tau vs hybrid)
2. Frontend framework (Next.js vs Streamlit)
3. Database (SQLite vs PostgreSQL)
4. Exact public API partner for production venue enrichment
5. Whether to expose cluster membership to users at all

---

*Next step: Review with mentors and lock stack by end of Week 1.*
