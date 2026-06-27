# taste.node — Clustering Architecture

| | |
|:---|:---|
| **Status** | Implementation-Aligned Reference |
| **Authority** | Derived from `docs/TDD.md` v0.2 and `docs/AGENTS.md` Three Pillars |
| **Date** | 2026-06-27 |
| **Scope** | Backend clustering pipeline (`src/similarity.py`, `src/clustering.py`, `src/recommendations.py`) |

---

## 1. What the Clustering Pipeline Does

taste.node clusters **users** based on how similarly they rank restaurants. If Alice and Bob both put the same sushi spot at #1 and the same ramen shop at #2, they are likely in the same taste cluster. When Alice visits a new place Bob also loves, the system recommends it to her with an explanation like:

> *"3 people in your default taste cluster ranked this in their top 3."*

The pipeline has four stages:

```
[ TasteProfile + TasteContext ]
            │
            ▼
[ Similarity Engine — Kendall Tau distance ]
            │  (per context_id, not global)
            ▼
[ Clustering Engine — HDBSCAN on precomputed matrix ]
            │
            ▼
[ Recommendation Scorer — α·cluster_affinity + β·filter_match + γ·temporal_boost ]
            │
            ▼
[ Sorted, explained recommendations ]
```

---

## 2. Data Model (The Inputs)

All clustering operates on `TasteProfile` objects, which are **contextual** — a user has multiple ranked lists, not one global list.

### 2.1 Core Types

```python
class Venue(BaseModel):
    id: str
    name: str
    location: Optional[Dict[str, float]]  # {"lat": float, "lng": float}
    cuisines: List[str]
    dietary_tags: List[str]
    price_tier: Optional[int]            # 1–4
    health_score: Optional[float]        # 0.0–1.0
    source: Literal["synthetic", "api", "user_added"]

class RankedItem(BaseModel):
    venue: Venue
    visited_at: datetime                 # when user physically ate there
    added_at: datetime                   # system audit timestamp
    occasion_tag: Literal["solo", "date", "business", "group", "comfort"]
    is_classic: bool                     # bypasses time-decay

    @computed_field
    @property
    def rank(self) -> float: ...         # derived, not stored

class TasteContext(BaseModel):
    context_id: str                      # e.g. "default", "date_night", "solo_comfort"
    ranked_list: List[RankedItem]        # ordered by user preference
    created_at: datetime
    updated_at: datetime

class TasteProfile(BaseModel):
    user_id: str
    contexts: Dict[str, TasteContext]    # keyed by context_id
    default_context: str = "default"     # must exist as a key
```

### 2.2 Why Contextual?

A single global ranked list is too coarse. taste shifts by social context:

- **date_night**: romantic, quiet, wine-friendly
- **business_lunch**: fast, reliable, near office
- **solo_comfort**: cheap, cosy, no reservations

Cross-context mixing is forbidden. A user may be in cluster A for `date_night` and cluster B for `business_lunch`.

---

## 3. Similarity Engine (`src/similarity.py`)

### 3.1 Kendall Tau Distance

For two users *a* and *b* in the same `context_id`, we extract only the venues they **both** ranked. We then compute:

```
distance = (1 − τ) / 2
```

where `τ` is the Kendall rank correlation coefficient from `scipy.stats.kendalltau`. This maps:

| Condition | `τ` | Distance | Meaning |
|---|---|---|---|
| Identical order | `+1.0` | `0.0` | Perfect agreement |
| Random / uncorrelated | `0.0` | `0.5` | No relationship |
| Perfect inverse | `−1.0` | `1.0` | Total disagreement |

### 3.2 Sentinel Values

| Condition | Return Value | Signal |
|---|---|---|
| No shared venues in context, or `τ` is NaN | `-1.0` | *insufficient data* |
| Perfect inverse correlation | `1.0` | *total disagreement* |
| Perfect agreement | `0.0` | *identical ordering* |

The `-1.0` sentinel is replaced with `1.0` (max distance) before HDBSCAN sees it, so no-overlap pairs do not artificially pull clusters together.

### 3.3 Time-Decay Weighting

Taste fades. A visit from two weeks ago matters more than one from two years ago — unless the user marked it `is_classic = True`.

```python
def time_decay_weight(
    visited_at: datetime,
    reference_time: datetime,
    halflife_days: float = 365.0,
    is_classic: bool = False,
) -> float:
    if is_classic:
        return 1.0
    age_days = max(0.0, (reference_time - visited_at).total_seconds() / 86400.0)
    return 2.0 ** (-age_days / halflife_days)
```

At `730` days old with `halflife = 365`, the weight is `0.25`. At `365` days, it is `0.5`.

---

## 4. Clustering Engine (`src/clustering.py`)

### 4.1 Why HDBSCAN?

Early designs used K-Means. K-Means assumes **Euclidean space** and **spherical Gaussian blobs**. Taste clusters are not spherical:

- "Burger lovers" form a dense blob around cheap American joints.
- "Michelin chasers" form a separate, sparser blob around fine dining.
- Some users are **noise** — their taste is too eclectic to belong anywhere.

**HDBSCAN** (Hierarchical Density-Based Spatial Clustering) discovers clusters of **arbitrary shape** and **does not require a preset cluster count `K`**. It is the only mature library that supports custom **precomputed distance matrices**.

### 4.2 Exact Configuration

```python
hdbscan.HDBSCAN(
    metric="precomputed",
    min_cluster_size=5,
    allow_single_cluster=False,
)
```

| Parameter | Value | Rationale |
|---|---|---|
| `metric` | `"precomputed"` | We supply the N×N distance matrix ourselves |
| `min_cluster_size` | `5` | A cluster needs at least 5 users to be valid |
| `allow_single_cluster` | `False` | Prevents the degenerate case where everyone is lumped together |

### 4.3 Pipeline

```python
class ContextualClusterMap:
    def __init__(self, profiles: List[TasteProfile], min_cluster_size: int = 5): ...
    def fit_context(self, context_id: str) -> ClusterResult: ...
    def fit_all_contexts(self) -> Dict[str, ClusterResult]: ...
    def get_label(self, user_id: str, context_id: str) -> Optional[int]: ...
```

**Steps for `fit_context(context_id)`:**

1. Filter to users who have `context_id` with a non-empty `ranked_list`.
2. Build an N×N symmetric distance matrix using `compute_similarity(..., context_id)`.
3. Replace sentinel `-1.0` with `1.0`.
4. Feed matrix to HDBSCAN.
5. Map `user_id → cluster_label` where `-1` means **noise**.
6. Cache the `ClusterResult`.

**Output shape:**

```json
{
  "context_id": "default",
  "labels": {"alice_42": 0, "bob_99": 0, "charlie_01": -1},
  "noise_ids": ["charlie_01"],
  "n_clusters": 1,
  "updated_at": "2026-06-27T10:00:00+00:00"
}
```

### 4.4 Noise Policy

Users labeled `-1` are excluded from recommendation aggregation but **retained** in the dataset for future re-clustering. They are not second-class citizens — they are simply taste-unique.

---

## 5. Recommendation Scorer (`src/recommendations.py`)

### 5.1 Score Formula

For a candidate venue *v*, user *u*, and context *c*:

```
score(v, u, c) = α · cluster_affinity(v, c)
               + β · filter_match(v, filters)
               + γ · temporal_boost(v, u)

where α = 0.5, β = 0.3, γ = 0.2
      score is clamped to [0.0, 0.98]
```

### 5.2 Term Definitions

| Term | Description | Weight |
|---|---|---|
| `cluster_affinity` | Inverted mean derived rank of *v* within *u*'s cluster in context *c*. Lower mean rank = higher affinity. Noise users get a cold-start fallback based on cuisine overlap with their own list. | `α = 0.5` |
| `filter_match` | Binary weighted match against active query params (cuisine, diet, price_tier, geo-radius). Each match contributes equally. | `β = 0.3` |
| `temporal_boost` | Median recency weight (`time_decay_weight`) of cluster peers who ranked *v*. More recent peer visits boost the score. | `γ = 0.2` |

### 5.3 Cold-Start / Noise Fallback

If the user is noise (`label == -1`) or no cluster exists yet:

- `cluster_affinity` falls back to **cuisine overlap** between the candidate venue and the user's own ranked list.
- Explanation template: *"This matches [filters] and is trending nearby."*

### 5.4 Explanation Generation

**Clustered user:**
> *"{n_peers} people in your {context_id} taste cluster ranked this in their top 3."*

**Noise / cold-start:**
> *"This matches {matched_filters} and is trending nearby within {radius_km} km."*

---

## 6. API Integration

### 6.1 Endpoints

| Method | Endpoint | What it does |
|---|---|---|
| `POST` | `/users` | Create a persisted taste profile |
| `GET` | `/users/{user_id}` | Retrieve a taste profile |
| `PUT` | `/users/{user_id}/contexts/{context_id}` | Upsert a contextual ranked list |
| `POST` | `/similarity?context_id={id}` | Compute Kendall-Tau distance between two profiles |
| `POST` | `/clusters/recalculate` | Run HDBSCAN on a context and cache the result |
| `GET` | `/recommendations?user={id}&context_id={id}&...` | Return scored, explained venue list |
| `GET` | `/venues` | Static venue pool (MVP) |

### 6.2 Computing Similarity

```bash
curl -X POST "http://localhost:8000/similarity?context_id=default" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_a": {<TasteProfile>},
    "profile_b": {<TasteProfile>}
  }'
```

**Response:**
```json
{"distance": 0.35, "shared_venues": 4, "context_id": "default"}
```

### 6.3 Triggering Cluster Recalculation

```bash
curl -X POST "http://localhost:8000/clusters/recalculate" \
  -H "Content-Type: application/json" \
  -d '{"context_id": "default"}'
```

**Response:** `ClusterResult` JSON (see §4.3).

### 6.4 Getting Recommendations

```bash
curl "http://localhost:8000/recommendations?user=alice_42&context_id=default&cuisine=Italian&price_tier=2&n=5"
```

**Response:**
```json
[
  {
    "venue": {"id": "venue_007", "name": "Pasta Palace", ...},
    "score": 0.87,
    "explanation": "3 people in your default taste cluster ranked this in their top 3.",
    "context_id": "default"
  }
]
```

---

## 7. Incremental Strategy (Future)

HDBSCAN does **not** natively support incremental fitting with precomputed matrices. For the MVP (`N ≤ 1,000` users), a full recompute is fast enough:

- **Complexity:** `O(N²)` comparisons, `O(N²)` memory for the dense matrix.
- **Trigger:** `PUT /users/{id}/contexts/{cid}` queues the context for recalculation.
- **Batch interval:** Every 5 minutes, dequeue and recompute once.
- **Manual:** `POST /clusters/recalculate` forces immediate recalculation.

For `N > 1,000`, precompute distance matrices asynchronously and store in object storage. Replace in-memory caches with Redis.

---

## 8. Boundaries & Invariants

| Rule | Where Enforced |
|---|---|
| `context_id` is **mandatory** in engine functions (`similarity.py`, `clustering.py`, `recommendations.py`) | Function signatures — typed as `str`, never `Optional` |
| `rank` is **derived**, never stored as raw integer | `@computed_field` + `@property` on `RankedItem` |
| No K-Means, Euclidean clustering, or scraping | `AGENTS.md` Pillar 1 & Pillar 4; ADR-001 rejection record |
| Cross-context mixing is forbidden | `recommendations.py` only reads `profile.contexts[context_id]` |
| Error responses follow exact `ErrorResponse` schema | `src/main.py` — every `HTTPException` wraps `ErrorResponse` |

---

## 9. File Map

```
src/
├── models.py            # Pydantic models (the contract)
├── similarity.py        # Kendall Tau + time-decay weights
├── clustering.py        # ContextualClusterMap (HDBSCAN wrapper)
├── recommendations.py   # Scoring, filtering, explanations
├── db.py                # SQLite persistence (SQLAlchemy Core)
└── main.py              # FastAPI routes only — no business logic
```

---

*This document is aligned with `docs/TDD.md` v0.2 and `docs/AGENTS.md`. For the formal ADR on rejected tools, see `docs/ADR-001_REJECTED_TOOLS.md`.*
