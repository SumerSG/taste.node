# Venue Metadata Ingestion Pipeline

| | |
|:---|:---|
| **Status** | Planning (Phase 2) |
| **Date** | 2026-06-22 |
| **Scope** | Transition from synthetic seed data to real venue metadata via public APIs |
| **Authority** | `docs/AGENTS.md` Pillar 4 |

---

## 1. Overview

The MVP bootstraps with a fully synthetic dataset. For production (Phase 2), real venue metadata must be ingested through documented public APIs only. This document defines the contract, flow, and normalization rules for that pipeline.

## 2. Data Flow

```
[Public API: Yelp Fusion / Google Places]
           │
           ▼
    [Rate-Limited HTTP Client]
           │
           ▼
    [Deduplication Layer]
           │
    ┌──────┴──────┐
    ▼             ▼
[Fuzzy Match] [Geo-Radius Deduplication]
    │             │
    └──────┬──────┘
           ▼
    [Normalization Layer]
           │
    ┌──────┴──────┐
    ▼             ▼
[Cuisine Map] [Dietary Tag Map]
    │             │
    └──────┬──────┘
           ▼
    [Schema Mapping to Pydantic Venue]
           │
           ▼
    [SQLite Persistence]
```

## 3. Public API Contracts

### 3.1 Yelp Fusion API

| Aspect | Specification |
|---|---|
| **Endpoint** | `GET https://api.yelp.com/v3/businesses/search` |
| **Auth** | Bearer token (OAuth 2.0) |
| **Rate Limit** | 500 requests / day (free tier); 5,000 / day (Developer tier) |
| **Backoff Strategy** | Exponential backoff (`1s × 2^n`, max `60s`) on `429` |
| **Key Fields** | `id`, `name`, `coordinates.latitude`, `coordinates.longitude`, `categories.title`, `price`, `rating` |
| **Mapping** | `categories.title[]` → `Venue.cuisines[]` (see §5.1); `price` string length → `Venue.price_tier` (1–4) |

### 3.2 Google Places API (New)

| Aspect | Specification |
|---|---|
| **Endpoint** | `POST https://places.googleapis.com/v1/places:searchNearby` |
| **Auth** | API key + field mask |
| **Rate Limit** | Dynamic quota; default 6,000 requests / minute |
| **Backoff Strategy** | Same exponential backoff as Yelp |
| **Key Fields** | `id`, `displayName.text`, `location.latitude`, `location.longitude`, `types[]` |
| **Mapping** | `types[]` → `Venue.cuisines[]` via Google-type taxonomy (see §5.2) |

## 4. Deduplication Logic

### 4.1 Fuzzy Name Matching
- Use `difflib.SequenceMatcher.ratio()` or `rapidfuzz` (future) on normalized venue names.
- **Threshold:** `ratio >= 0.90` → candidate duplicate.

### 4.2 Geo-Radius Guard
- Candidate duplicates must also be within **100 meters** geodesic distance.
- Formula: Haversine distance on `(lat, lng)`.

### 4.3 Merge Rule
- If `name_ratio >= 0.90` AND `geo_distance < 100m` AND same metro region → **merge**.
- Preserve the record with the **highest data confidence** (API-source preferred over user-submitted).

## 5. Normalization Rules

### 5.1 Cuisine Taxonomy (Yelp → Internal)

| Yelp Category | Internal Cuisine |
|---|---|
| "Italian" | "Italian" |
| "Sushi Bars" | "Japanese" |
| "Ramen" | "Japanese" |
| "Burgers" | "American" |
| "Vegan" | "Vegan" (also adds `diet-vegan` tag) |
| "Dim Sum" | "Chinese" |
| "Mexican" | "Mexican" |
| "Thai" | "Thai" |

**Rule:** Leaf categories are preferred for storage. Parent-node matching is handled at query time.

### 5.2 Dietary Tag Extraction

Dietary tags are derived from **both** API metadata and menu-text heuristics (if available):

| Signal | Tag | Confidence |
|---|---|---|
| Yelp `categories` contains "Vegan" | `diet-vegan` | High |
| Yelp `categories` contains "Vegetarian" | `diet-vegetarian` | High |
| Menu text contains "gluten-free" | `diet-gluten-free` | Medium |
| Menu text contains "halal" | `diet-halal` | Medium |
| No explicit signal | None | — |

### 5.3 Price Tier Mapping

| Source | Mapping to `price_tier` (1–4) |
|---|---|
| Yelp `$` | 1 |
| Yelp `$$` | 2 |
| Yelp `$$$` | 3 |
| Yelp `$$$$` | 4 |
| Google `PRICE_LEVEL_INEXPENSIVE` | 1 |
| Google `PRICE_LEVEL_MODERATE` | 2 |
| Google `PRICE_LEVEL_EXPENSIVE` | 3 |
| Google `PRICE_LEVEL_VERY_EXPENSIVE` | 4 |

### 5.4 Health Score

For API-ingested venues, `health_score` is initially `None` (neutral). A future Phase 3 pipeline may compute it from menu-text analysis or inspection-grade APIs.

## 6. Schema Mapping to Pydantic Venue

Every ingested venue **must** map 1:1 to the locked `Venue` model in `docs/TDD.md` Chapter 2:

```python
Venue(
    id=api_id,              # stable API identifier
    name=normalized_name,
    location={"lat": lat, "lng": lng},
    cuisines=mapped_cuisines,
    dietary_tags=extracted_dietary_tags,
    price_tier=mapped_price_tier,
    health_score=None,      # future pipeline
    source="api",           # Literal enforced
)
```

## 7. Rate-Limiting & Resilience

| Concern | Strategy |
|---|---|
| Daily quota exhaustion | Circuit breaker: stop ingestion for 24h after 3 consecutive `429`s |
| Partial failure | Every batch is transactional; failed records are logged to `ingestion_errors.jsonl` |
| API deprecation | Abstract ingestion behind `VenueIngestionAdapter` protocol; swap adapter without changing schema mapping |

## 8. Out of Scope for MVP

- Menu text scraping (BeautifulSoup, Scrapy) — forbidden per `AGENTS.md` Pillar 4.
- Real-time ingestion stream.
- Multi-source confidence scoring beyond simple enum mapping.

---

*This document is subordinate to `docs/AGENTS.md` and `docs/TDD.md` v0.2. Any schema change to `Venue` requires a TDD amendment.*
