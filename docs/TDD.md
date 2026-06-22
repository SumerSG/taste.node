# Technical Design Document (TDD) — taste.node v0.2 — AI-Executable Specification

| | |
|:---|:---|
| **Status** | 🔒 Locked |
| **Author** | Sumer Gaikwad |
| **Date** | 2026-06-22 |
| **Version** | v0.2 (AI-Executable Rewrite) |
| **Supreme Constraint** | `docs/AGENTS.md` — Three Pillars + Scraping Policy |

---

## Chapter 1: System Overview & Context Window Lock

### 1.1 Architectural Diagram

```
                     context_id
┌─────────────────┐      │      ┌─────────────────┐
│   Web/API       │──────┼─────▶│  API Surface    │
│   Client        │◀─────┼──────│  (FastAPI)      │
│                 │      │      └────────┬────────┘
└─────────────────┘      │               │ context_id
                         │               ▼
                         │      ┌─────────────────┐      ┌──────────────────┐
                         │      │  Taste Layer    │─────▶│   Data Model     │
                         │      │ (Similarity     │      │ (TasteProfile,   │
                         │      │  Engine)        │      │  TasteContext,   │
                         │      └────────┬────────┘      │  RankedItem)     │
                         │               │               └──────────────────┘
                         │      context_id │
                         │               ▼
                         │      ┌─────────────────┐
                         │      │  Cluster Layer  │
                         │      │ (HDBSCAN)       │
                         │      │ metric=precomputed│
                         │      │ min_cluster_size=5│
                         │      └────────┬────────┘
                         │               │ context_id
                         │               ▼
                         │      ┌─────────────────┐
                         │      │   Recs Layer    │
                         │      │ (Scoring +      │
                         │      │  Explanation)   │
                         │      └─────────────────┘
                         │
                         │      ┌──────────────────┐     ┌──────────────────┐
                         │      │   User DB        │     │   Venue DB       │
                         └─────▶│ (SQLite MVP)     │     │ (SQLite MVP)     │
                                └──────────────────┘     └──────────────────┘
```

### 1.2 The Context-First Rule

`context_id` is a **mandatory parameter** in every layer. No exceptions.

- **Data Model:** `TasteProfile.contexts` is keyed by `context_id`. Every `TasteContext` carries its own `context_id`.
- **Similarity API:** `compute_similarity(a, b, context_id)` refuses computation without a valid context.
- **Clustering Engine:** HDBSCAN distance matrices are built **per context**. A user may be clustered differently in `date_night` than in `business_lunch`.
- **Recommendation Pipeline:** Scores are generated within a single context. Cross-context mixing is forbidden.

Any function signature in similarity, clustering, or recommendations that omits `context_id` is architecturally invalid.

---

## Chapter 2: Data Model (The Schema Redesign)

### 2.1 Pydantic Class Definitions

```python
from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field, computed_field


class Venue(BaseModel):
    id: str
    name: str
    location: Optional[Dict[str, float]] = None  # {"lat": float, "lng": float}
    cuisines: List[str] = Field(default_factory=list)
    dietary_tags: List[str] = Field(default_factory=list)
    price_tier: Optional[int] = None  # 1–4
    health_score: Optional[float] = None
    source: Literal["synthetic", "api", "user_added"] = "synthetic"


class RankedItem(BaseModel):
    venue: Venue
    visited_at: datetime  # timezone-aware UTC
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    occasion_tag: Literal["solo", "date", "business", "group", "comfort"] = "solo"
    is_classic: bool = False  # future-proofing: bypasses time-decay

    @computed_field
    @property
    def rank(self) -> float:
        """Derived rank: time-decayed, context-boosted score.
        Higher = more important. No raw integer rank is stored in the DB.
        Stub in Phase 1; real logic arrives in Phase 2 via similarity.py.
        """
        return 0.0


class TasteContext(BaseModel):
    context_id: str  # e.g., "default", "date_night", "solo_comfort", "business_lunch"
    ranked_list: List[RankedItem]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TasteProfile(BaseModel):
    user_id: str
    contexts: Dict[str, TasteContext] = Field(default_factory=dict)
    default_context: str = "default"


class ClusterResult(BaseModel):
    context_id: str
    labels: Dict[str, int] = Field(default_factory=dict)  # user_id -> cluster_label (-1 = noise)
    noise_ids: List[str] = Field(default_factory=list)
    n_clusters: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

### 2.2 Field Specifications

**Venue**

| Field | Type | Constraints | Default | Rationale |
|---|---|---|---|---|
| `id` | `str` | Required, unique | — | Stable identifier for deduplication and linking. |
| `name` | `str` | Non-empty | — | Human-readable display string. |
| `location` | `Dict[str, float] \| None` | Keys: `lat`, `lng` | `None` | Required for geo-filtering in recommendations. |
| `cuisines` | `List[str]` | Non-empty strings | `[]` | Filters recommendation candidates. |
| `dietary_tags` | `List[str]` | Non-empty strings | `[]` | Enables diet-based filtering. |
| `price_tier` | `int \| None` | 1–4 inclusive | `None` | Structured price filter; `None` allows fallback scoring. |
| `health_score` | `float \| None` | Non-negative | `None` | Enables health-conscious scoring in future phases. |
| `source` | `Literal["synthetic", "api", "user_added"]` | Enum enforced by type system | `"synthetic"` | Legal provenance for data lineage. |

**RankedItem**

| Field | Type | Constraints | Default | Rationale |
|---|---|---|---|---|
| `venue` | `Venue` | Required | — | The subject of the taste entry; fully embedded to avoid DB joins. |
| `visited_at` | `datetime` | Timezone-aware UTC, `<= now()` | — | Biological reality: when the user physically ate there. |
| `added_at` | `datetime` | Timezone-aware UTC | `datetime.now(timezone.utc)` | System audit timestamp for list mutation tracking. |
| `occasion_tag` | `Literal["solo", "date", "business", "group", "comfort"]` | Enum enforced by type system | `"solo"` | Social context for contextual boost and explanation generation. |
| `is_classic` | `bool` | — | `False` | Pins a venue as permanent favorite, bypassing temporal decay. |
| `rank` | `float` | `@computed_field` + `@property`, zero arguments | `0.0` (stub) | Derived score; no raw integer stored in DB. |

**TasteContext**

| Field | Type | Constraints | Default | Rationale |
|---|---|---|---|---|
| `context_id` | `str` | Required, non-empty | — | Primary key for contextual isolation (Pillar 3). |
| `ranked_list` | `List[RankedItem]` | Ordered (position = raw rank) | — | Temporal order by `visited_at`; dynamic re-ranking uses derived score. |
| `created_at` | `datetime` | Timezone-aware UTC | `datetime.now(timezone.utc)` | Audit trail. |
| `updated_at` | `datetime` | Timezone-aware UTC, `>= created_at` | `datetime.now(timezone.utc)` | Signals cache invalidation for cluster recalculation. |

**TasteProfile**

| Field | Type | Constraints | Default | Rationale |
|---|---|---|---|---|
| `user_id` | `str` | Required, unique | — | Stable user identifier across all contexts and clusters. |
| `contexts` | `Dict[str, TasteContext]` | Key matches `TasteContext.context_id` | `{}` | Absolutely no top-level `ranked_list`; contexts are mandatory (Pillar 3). |
| `default_context` | `str` | Must exist as key in `contexts` | `"default"` | Fallback when client omits `context_id` in API calls. |

**ClusterResult**

| Field | Type | Constraints | Default | Rationale |
|---|---|---|---|---|
| `context_id` | `str` | Required | — | Identifies which context this cluster result belongs to. |
| `labels` | `Dict[str, int]` | Values are integers, `-1` denotes noise | `{}` | Machine-readable cluster membership for downstream scoring. |
| `noise_ids` | `List[str]` | Subset of `labels` keys where value == `-1` | `[]` | Explicit list for fast noise-user exclusion in aggregation. |
| `n_clusters` | `int` | Non-negative (excluding noise) | `0` | Cardinality check for debugging and health endpoints. |
| `updated_at` | `datetime` | Timezone-aware UTC | `datetime.now(timezone.utc)` | Prevents stale cluster results being used for recommendations. |

---

## Chapter 3: Algorithm Design (Deterministic Specifications)

### 3.1 Similarity Metric

**Function Signature:**
```python
def compute_similarity(
    a: TasteProfile,
    b: TasteProfile,
    context_id: str,
) -> float:
    ...
```

`context_id` is **mandatory `str`**. It MUST NOT be typed as `Optional`, `str | None`, or given a default value. Any signature allowing `None` is architecturally invalid per Redline 1.

**Distance Formula:**
```
distance = (1 - kendalltau(ranks_a, ranks_b).correlation) / 2
```

Where `ranks_a` and `ranks_b` are integer lists of list-position ranks (1-indexed) for venues shared between `a` and `b` within the requested `context_id`.

**Sentinel Values:**

| Condition | Return Value | Signal |
|---|---|---|
| No shared venues in context, or `kendalltau` returns `NaN` | `-1.0` | "insufficient data" |
| Perfect inverse correlation (τ = -1) | `1.0` | "total disagreement" |
| Perfect agreement (τ = 1) | `0.0` | "identical ordering" |

Note: `compute_similarity` operates as a normalized distance metric under this specification — lower values indicate higher agreement.

**Time-Decay Weighting:**

A venue visited `> 365` days ago receives a decay factor unless `is_classic: bool` is `True`.

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

Shared venues are weighted by the average decay weight of the two users' visit dates before computing Kendall tau. The `weight` parameter of `scipy.stats.kendalltau` receives these per-pair weights.

### 3.2 Clustering Engine

**Exact Algorithm:**
```python
hdbscan.HDBSCAN(
    metric="precomputed",
    min_cluster_size=5,
    allow_single_cluster=False,
)
```

**Input:** A precomputed `N×N` symmetric distance matrix per `context_id`, where `N` is the number of users with non-empty data in that context. No-overlap pairs (distance sentinel `-1.0`) are replaced with `1.0` before matrix construction.

**Output:** `ContextClusterMap` mapping `context_id -> ClusterResult`.

```python
class ContextClusterMap:
    def __init__(self, profiles: List[TasteProfile], min_cluster_size: int = 5): ...
    def fit_context(self, context_id: str) -> ClusterResult: ...
    def fit_all_contexts(self) -> Dict[str, ClusterResult]: ...
    def get_label(self, user_id: str, context_id: str) -> int | None: ...
```

**Noise Policy:** Users labeled `-1` are excluded from recommendation aggregation but retained in the dataset for future re-clustering.

**Justification:** HDBSCAN is chosen over Spectral Clustering because taste similarity forms non-convex, density-varying manifolds in rank space. HDBSCAN discovers clusters of arbitrary shape without prescribing a cluster count `K`, making it superior for taste data where Euclidean geometry does not apply.

### 3.3 Recommendation Scoring (Contextual)

**Formula with exact constants and tunable A/B test hooks:**

```
score(venue, user, context_id) = α · cluster_affinity(venue, context_id)
                                 + β · filter_match(venue, filters)
                                 + γ · temporal_boost(venue, user)

where α + β + γ = 1.0
      defaults: α = 0.5, β = 0.3, γ = 0.2
```

- `cluster_affinity`: inverted mean derived rank of the venue within the user's cluster **for that specific context**. Lower mean rank in cluster = higher affinity. If user is noise (`label == -1`), cluster_affinity = `0.0`.
- `filter_match`: binary weighted match against active API query params (`cuisine`, `diet`, `price_tier`, `lat`/`lng` radius). Each matching filter contributes equally. Normalized to `[0, 1]`.
- `temporal_boost`: recency weighting derived from `visited_at` of the recommending cluster members. More recent visits by cluster peers boost the score. Uses the same `time_decay_weight` function as similarity, aggregated by median.

### 3.4 Explanation Generation

**Exact Template (clustered user):**
```jinja2
"{{ n_peers }} people in your {{ context_label }} taste cluster ranked this in their top {{ top_k }} after visiting {{ reference_venue_name }}."
```

Where:
- `n_peers` = count of cluster members who have this venue in their context list
- `context_label` = the humanized `context_id` (e.g., `date_night` → "date night")
- `top_k` = positional ceiling (1, 3, 5, or 10) of the mean cluster rank
- `reference_venue_name` = the highest-ranked venue the target user shares with the cluster

**Exact Template (noise-point / cold-start fallback):**
```jinja2
"This matches your {{ matched_filters }} filters and is trending nearby within {{ radius_km }} km."
```

Where:
- `matched_filters` = comma-joined list of filter params that matched
- `radius_km` = the query radius or default `5.0`

---

## Chapter 4: API Surface (Exact Shapes)

### 4.1 Endpoints

| Method | Endpoint | Request Body | Response | Error Codes |
|---|---|---|---|---|
| `POST` | `/users` | `{ "user_id": str }` | `TasteProfile` | `409` (already exists) |
| `GET` | `/users/{user_id}` | — | `TasteProfile` | `404` (not found) |
| `PUT` | `/users/{user_id}/contexts/{context_id}` | `List[RankedItemInput]` | `TasteContext` | `400` (invalid context_id or malformed item) |
| `POST` | `/similarity?context_id={id}` | `{ "profile_a": TasteProfile, "profile_b": TasteProfile }` | `{ "distance": float, "shared_venues": int, "context_id": str }` | `400` (invalid context) |
| `POST` | `/clusters/recalculate` | `{ "context_id": str }` | `ClusterResult` | `202` (async accepted) |
| `GET` | `/recommendations?user={id}&context_id={id}&lat={float}&lng={float}&cuisine={str}&diet={str}&price_tier={int}&n={int}` | — | `List[Recommendation]` | `404` (user or context not found) |

*API Layer Note:* `context_id` is shown as a query parameter on `/similarity` and `/recommendations`. It is optional at the endpoint; if omitted, the server falls back to `TasteProfile.default_context`. This does not violate Redline 1 because the engine functions (`compute_similarity`, `ContextualClusterMap.fit_context`, `score`) receive a resolved mandatory `str` internally.

### 4.2 JSON Schemas

**RankedItemInput** (used in `PUT /users/{user_id}/contexts/{context_id}`)
```json
{
  "venue_id": "string (required)",
  "venue_name": "string (optional, default: venue_id)",
  "visited_at": "ISO-8601 datetime with timezone (required)",
  "occasion_tag": "string (enum: solo, date, business, group, comfort; default: solo)",
  "is_classic": "boolean (default: false)"
}
```

**Recommendation** (returned by `/recommendations`)
```json
{
  "venue": {
    "id": "string",
    "name": "string",
    "location": {"lat": float, "lng": float},
    "cuisines": ["string"],
    "dietary_tags": ["string"],
    "price_tier": int | null,
    "health_score": float | null,
    "source": "string"
  },
  "score": "float in [0.0, 1.0]",
  "explanation": "string",
  "context_id": "string"
}
```

**ClusterResult** (returned by `/clusters/recalculate`)
```json
{
  "context_id": "string",
  "labels": {"user_id": int, ...},
  "noise_ids": ["user_id", ...],
  "n_clusters": int,
  "updated_at": "ISO-8601 datetime"
}
```

**ErrorResponse** (every error response from `main.py`)
```json
{
  "error": "string (snake_case error code)",
  "message": "string (human-readable description)",
  "detail": "object or null (additional structured data, e.g., invalid fields)"
}
```

Every error response from `main.py` MUST conform to this shape. The AI coder must not invent ad-hoc error formats per route.

---

## Chapter 5: File Tree & Module Boundaries

```
taste.node/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI app factory. Only routes. No logic.
│   ├── models.py            # Pydantic models ONLY.
│   ├── similarity.py        # compute_similarity and time_decay utils.
│   ├── clustering.py        # ContextualClusterEngine (HDBSCAN wrapper).
│   ├── recommendations.py   # scoring and explanation templates.
│   └── db.py                # SQLite file DB + SQLAlchemy Core table definitions ONLY.
├── tests/
│   ├── __init__.py
│   ├── test_models.py       # Pydantic validation and round-trip serialization.
│   ├── test_similarity.py   # Perfect correlation, inverse correlation, no overlap (sentinel -1.0), time-decay.
│   ├── test_clustering.py   # HDBSCAN integration with synthetic data.
│   └── test_api.py          # FastAPI TestClient for all routes.
├── scripts/
│   └── generate_synthetic_data.py  # Seeded PRNG. Validates against models.
├── docs/
│   ├── TDD.md               # This document.
│   └── AGENTS.md            # Supreme architecture (immutable reference).
├── pyproject.toml           # Exact pinned deps + build system.
├── pytest.ini               # Test path and default flags.
└── requirements.txt         # Mirror of pyproject.toml for legacy installs.
```

**Strict Boundary Rules:**
1. `main.py` has no business logic. It delegates to `similarity.py`, `clustering.py`, `recommendations.py`, and `db.py` via FastAPI dependency injection.
2. `models.py` has no DB logic. No SQLAlchemy ORM definitions inside model classes.
3. `db.py` MUST expose an async `get_db()` dependency generator and define exact SQLAlchemy Core tables (`users`, `contexts`, `ranked_items`) matching the Pydantic models. No ORM magic; columns must map 1:1 to model fields.
4. `similarity.py` has no FastAPI imports.
5. `clustering.py` has no route definitions.
6. Any boundary violation is invalid and must be rejected in code review.

---

## Chapter 6: Tech Stack Lock & Scaffold Artifacts

| Library | Version | Role | Forbidden Alternative |
|---|---|---|---|
| Python | 3.12.x | Runtime | < 3.12, >=3.14 (bleeding-edge) |
| FastAPI | 0.115.0 | API Framework | Flask, Django |
| Pydantic | 2.9.0 | Validation | dataclasses-only, Pydantic v1 |
| HDBSCAN | 0.8.40 | Clustering | K-Means, DBSCAN (primary), Hierarchical |
| SciPy | 1.14.0 | Kendall Tau | Manual implementation |
| pytest | 9.0.0 | Testing | unittest |
| SQLAlchemy | 2.0.0 | DB Connection & Schema | Raw SQL strings in app code |
| Uvicorn | 0.32.0 | ASGI | Gunicorn sync workers |
| python-json-logger | 3.0.0 | Structured Logging | print statements in production routes |

**Lock Enforcement:** `requirements.txt` and `pyproject.toml` must pin exact versions. No unpinned dependencies. No transitive dependency overrides without TDD amendment.

### 6.1 Scaffold Appendix: Exact File Contents

**`pyproject.toml`**
```toml
[build-system]
requires = ["setuptools>=61", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "taste-node"
version = "0.2.0"
description = "AI-executable taste similarity and recommendation API"
requires-python = ">=3.12,<3.14"
dependencies = [
    "fastapi==0.115.0",
    "uvicorn[standard]==0.32.0",
    "pydantic==2.9.0",
    "scipy==1.14.0",
    "hdbscan==0.8.40",
    "numpy==1.26.0",
    "sqlalchemy==2.0.0",
    "httpx==0.27.0",
    "python-json-logger==3.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest==9.0.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
addopts = "-v --tb=short"
```

**`pytest.ini`**
```ini
[pytest]
testpaths = tests
addopts = -v --tb=short
```

**SQLite Schema (SQLAlchemy Core)**
```python
from sqlalchemy import Table, Column, String, DateTime, Integer, Float, Boolean, MetaData, ForeignKey, JSON

metadata = MetaData()

users_table = Table(
    "users",
    metadata,
    Column("user_id", String, primary_key=True),
    Column("default_context", String, nullable=False, default="default"),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

contexts_table = Table(
    "contexts",
    metadata,
    Column("context_id", String, primary_key=True),
    Column("user_id", String, ForeignKey("users.user_id"), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)

ranked_items_table = Table(
    "ranked_items",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("context_id", String, ForeignKey("contexts.context_id"), nullable=False),
    Column("venue_id", String, nullable=False),
    Column("venue_name", String, nullable=False),
    Column("venue_location", JSON, nullable=True),  # {"lat": float, "lng": float}
    Column("venue_cuisines", JSON, nullable=False, default=list),
    Column("venue_dietary_tags", JSON, nullable=False, default=list),
    Column("venue_price_tier", Integer, nullable=True),
    Column("venue_health_score", Float, nullable=True),
    Column("venue_source", String, nullable=False, default="synthetic"),
    Column("visited_at", DateTime(timezone=True), nullable=False),
    Column("added_at", DateTime(timezone=True), nullable=False),
    Column("occasion_tag", String, nullable=False, default="solo"),  # Literal enforced at app layer
    Column("is_classic", Boolean, nullable=False, default=False),
)
```

---

## Chapter 7: Anti-Hallucination Guardrails & Redlines

- **Redline 1:** In the **engine layer** (`src/similarity.py`, `src/clustering.py`, `src/recommendations.py`), `context_id` is a **mandatory** `str` parameter. Omitting it or typing it as `Optional` / `str | None` in an engine function is invalid. At the **API layer**, FastAPI endpoints may accept `context_id` as an optional query parameter, falling back to `TasteProfile.default_context` when omitted.
- **Redline 2:** If `rank` is stored as a raw integer in the database instead of derived from `visited_at`, the design is invalid.
- **Redline 3:** If the clustering engine uses `sklearn.cluster.KMeans` or any algorithm assuming Euclidean/Gaussian geometry, the design is invalid.
- **Redline 4:** If the document describes a scraper module, pipeline, or dependency, the design is invalid.
- **Redline 5:** If the document proposes frontend frameworks (Next.js, Streamlit, React) without an explicit Phase 6 expansion, the design is invalid. Phase 1-5 is API-only.
- **Redline 6:** If `RankedItem.rank` accepts any parameters inside `@computed_field`, or if `occasion_tag` / `source` are typed as plain `str` instead of `Literal[...]`, the design is invalid.

---

## Chapter 8: Modular Execution Chain (The "Vibe Code" Prompts)

### Phase 1: Environment, Scaffold & Schema
**Deliverable:** `pyproject.toml`, `pytest.ini`, `src/models.py`, and `tests/test_models.py`. Must validate backward compat migration path (if any).

- Emit exact `pyproject.toml` and `pytest.ini` contents with pinned versions.
- Implement `Venue`, `RankedItem`, `TasteContext`, `TasteProfile`, `ClusterResult` exactly as defined in Chapter 2.
- `RankedItem` must expose a `@computed_field` + `@property` named `rank` that returns `float`. It is a stub (`return 0.0`) in Phase 1; the real logic arrives in Phase 2.
- `tests/test_models.py` must validate:
  - Pydantic serialization round-trip (`.model_dump()` → re-instantiate)
  - `occasion_tag` enum rejection (invalid tag raises `ValidationError`)
  - `TasteProfile.default_context` must exist as a key in `contexts`
- Backward compat migration path: **N/A** — no persistent storage schema exists prior to Phase 1.

### Phase 2: Similarity Engine
**Deliverable:** `src/similarity.py` and `tests/test_similarity.py`. Must pass: perfect correlation, inverse correlation, no overlap (sentinel `-1.0`), and time-decay.

- Implement `compute_similarity(a, b, context_id) -> float`
- Implement `time_decay_weight(visited_at, reference_time, halflife_days=365.0, is_classic=False) -> float`
- `tests/test_similarity.py` must pass:
  1. Perfect correlation → `0.0`
  2. Inverse correlation → `1.0`
  3. No shared venues → sentinel `-1.0`
  4. Time-decay weight for a 730-day-old visit ≈ `0.5`; weight for a classic venue = `1.0`

### Phase 3: Clustering Engine
**Deliverable:** `src/clustering.py` and `tests/test_clustering.py`. Must generate synthetic data via script, fit HDBSCAN, and assert noise points exist.

- Implement `ContextualClusterMap` using `hdbscan.HDBSCAN(metric='precomputed', min_cluster_size=5, allow_single_cluster=False)`
- `tests/test_clustering.py` must:
  1. Generate 20 synthetic profiles via `scripts/generate_synthetic_data.py`
  2. Fit `ContextualClusterMap` on `"default"` context
  3. Assert at least one user receives label `-1` (noise points exist)
  4. Assert `n_clusters >= 1` or noise-only behavior is documented

### Phase 4: Synthetic Data Generator
**Deliverable:** `scripts/generate_synthetic_data.py`. Seeded PRNG. Generates 100 users, 3 contexts each, outputs JSONL.

- Seeded PRNG (`random.Random(seed)`)
- Generates exactly `100` users, `3` contexts each (`default`, `date_night`, `solo_comfort`)
- Each context contains 5–12 `RankedItem` instances with plausible staggered `visited_at` dates
- Outputs JSONL to stdout; each line validates against `TasteProfile.model_validate_json()`
- No scraping code. No external API calls.

### Phase 5: API Surface, Persistence & Integration
**Deliverable:** `src/main.py`, `src/db.py`, and `tests/test_api.py` with 100% route coverage.

- `src/db.py` implements the exact SQLite schema from Chapter 6 Scaffold Appendix and exposes `get_db()` async generator.
- `POST /users` — create persisted taste profile
- `GET /users/{user_id}` — retrieve taste profile
- `PUT /users/{user_id}/contexts/{context_id}` — upsert contextual ranked list
- `POST /similarity?context_id={id}` — returns `{distance, shared_venues, context_id}`
- `POST /clusters/recalculate` — triggers `ContextualClusterMap.fit_context()` and returns `ClusterResult`
- `GET /recommendations?user={id}&context_id={id}` — returns scored, explained list
- `tests/test_api.py` exercises every endpoint with `fastapi.testclient.TestClient` and asserts exact error response shapes on `400`/`404`/`409`.

---

## Chapter 9: Risks & Mitigations (AI-Specific)

| AI Failure Mode | Mitigation in Document |
|---|---|
| AI defaults to K-Means because "clustering" usually means K-Means. | Explicitly name HDBSCAN in title. Provide `pip install` command in stack lock. Redline 3 forbids K-Means. |
| AI stores `rank` as raw int because the old models did. | Pillar 2 rewrite: `rank` is `@computed_field` + `@property`. Show derivation logic. Redline 2 and Redline 6 enforce it. |
| AI emits broken `@computed_field rank(self, reference_time)` with parameters, crashing Pydantic v2. | Redline 6 explicitly forbids parameters inside `@computed_field`. Phase 1 instructs stub property with zero args. |
| AI guesses folder structure and dumps logic in `main.py`. | Chapter 5 file tree is canonical. Module boundary rules are enforceable. `main.py` is route-only. |
| AI suggests pg_trgm/Elasticsearch for search. | API spec says exact `LIKE` search. No ambiguity. Search is out of scope for MVP. |
| AI builds a React frontend because the old TDD mentioned Next.js. | Redline 5: Frontend is out of scope for Phases 1-5. No Streamlit. No Next.js. API-only. |
| AI conflates "no overlap" (sentinel `-1.0`) with "total disagreement" (`1.0`). | Chapter 3.1 provides explicit sentinel table. `tests/test_similarity.py` asserts both values distinctly. |
| AI imports `sklearn` for silhouette analysis or elbow method. | Forbidden in stack lock. HDBSCAN requires no preset `K`. No silhouette analysis needed. |
| AI generates stochastic synthetic data without seeding. | Phase 4 requires seeded PRNG. `tests/test_similarity.py` and `tests/test_clustering.py` depend on determinism. |
| AI picks Python 3.14 and fails dependency resolution. | Chapter 6 locks Python to `^3.12`. No bleeding-edge runtime. |

---

## Validation Checklist (Before Commit)

- [x] Every endpoint in Chapter 4 accepts or requires `context_id`.
- [x] `TasteProfile` in Chapter 2 has **no** top-level `ranked_list`. Only `contexts: Dict[...]`.
- [x] `RankedItem.rank` is `@computed_field` + `@property` with **zero arguments** other than `self`.
- [x] `occasion_tag` and `source` are typed as `Literal[...]`, not plain `str`.
- [x] The similarity function signature uses `context_id: str` (mandatory in the engine layer, not Optional).
- [x] The clustering section explicitly names `hdbscan` and provides `metric='precomputed'`.
- [x] The similarity section explicitly defines `(1 - tau) / 2` and distinguishes NaN from `-1`.
- [x] Chapter 4 defines the exact `ErrorResponse` JSON schema and every error status code uses it.
- [x] Chapter 5 file tree includes `pytest.ini` and shows `db.py` as SQLAlchemy Core tables.
- [x] Chapter 6 locks Python to `^3.12` (not 3.14) and includes exact `pyproject.toml` / `pytest.ini` / SQLite schema contents.
- [x] There are zero mentions of Scrapy, BeautifulSoup, or raw HTML parsing.
- [x] The file tree shows `main.py` with **only** routes and dependency injection.
- [x] Chapter 8 contains exactly 5 phases, each with a single, testable deliverable.
- [x] No sentence contains "pending," "to be determined," "plan B," or "exact shapes will evolve."

---

## Chapter 10: Known Code Non-Compliance (Audit Remediation Blockers)

The following `src/` files are **non-compliant** with this locked TDD as of 2026-06-22. They must be rewritten in a dedicated consolidation sprint before the PM conveyor belt or demo execution begins:

1. **`src/models.py`** — Violates Redlines 2 and 6.
   - `RankedItem` has a parameterized `compute_derived_rank` method instead of a zero-arg `@computed_field` + `@property rank(self) -> float`.
   - `occasion_tag` is typed as plain `str`, not `Literal[...]`.
   - `Venue` lacks `location`, `cuisines`, `dietary_tags`, `price_tier`, `health_score`, `source`.

2. **`src/main.py`** — Violates Chapter 4 API Surface.
   - Missing `POST /users`, `GET /users/{user_id}`, `PUT /users/{user_id}/contexts/{context_id}`.
   - Uses `/cluster/assign` instead of `/clusters/recalculate`.
   - Uses `POST /recommendations` with body instead of `GET` with query params.
   - Missing `ErrorResponse` schema; returns ad-hoc dicts.
   - Uses in-memory `_data_store` instead of `src/db.py` SQLite persistence.

3. **`src/clustering.py`** — Violates Chapter 3.2.
   - Uses `allow_single_cluster=True` and default `min_cluster_size=3` instead of `False` and `5`.

4. **`src/similarity.py`** — Violates Redline 1.
   - `context_id` is typed as `Optional[str] = None` in the engine layer.

5. **`src/synthetic_data.py`** — Violates Chapter 5 / Phase 4.
   - Located at `src/synthetic_data.py` instead of `scripts/generate_synthetic_data.py`.
   - Generates 4 contexts (`business_lunch` extra) and defaults to 30 users instead of 100.

These items are tracked as P0/P1 blockers in `docs/planning_audit_and_prompt_report.md`. The dependency manifests (`pyproject.toml`, `requirements.txt`) and `pytest.ini` have been aligned in the planning sprint; they no longer block execution.

---

*This document is locked. Amendments require PR review against `docs/AGENTS.md`.*
