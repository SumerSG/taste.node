# taste.node — Data Contract

| | |
|:---|:---|
| **Status** | Locked |
| **Authority** | Derives from `docs/TDD.md` Chapter 2 & Chapter 4 and `docs/AGENTS.md` Pillar 3. |
| **Date** | 2026-06-22 |

---

## 1. Purpose

This document is the **canonical JSON contract** between the taste.node FastAPI backend and any frontend or integration client. It is the handoff artifact required by `PM_TEAM_BUILDING_PROMPT.md` Gate 5→6. Every shape below is copy-pasteable into `curl` or `fetch()`.

---

## 2. Pydantic Model Shapes

### 2.1 Venue

```json
{
  "id": "string (required, unique)",
  "name": "string (required, non-empty)",
  "location": {"lat": 40.7128, "lng": -74.0060},
  "cuisines": ["string"],
  "dietary_tags": ["string"],
  "price_tier": 1,
  "health_score": 0.8,
  "source": "synthetic"
}
```

- `location` is optional (`null` allowed). Required for geo-filtering.
- `price_tier`: `null`, `1`, `2`, `3`, or `4`.
- `health_score`: `null` or float in `[0.0, 1.0]`.
- `source`: enum `"synthetic" | "api" | "user_added"`.

### 2.2 RankedItem

```json
{
  "venue": {<Venue object>},
  "visited_at": "2025-06-15T19:30:00+00:00",
  "added_at": "2026-06-22T10:00:00+00:00",
  "occasion_tag": "solo",
  "is_classic": false,
  "rank": 0.0
}
```

- `visited_at` is required. Must be ISO-8601 with timezone.
- `added_at` defaults to `datetime.now(timezone.utc)` if omitted.
- `occasion_tag` enum: `"solo" | "date" | "business" | "group" | "comfort"`. Default: `"solo"`.
- `is_classic` default: `false`.
- `rank` is a **read-only computed field** (float). It is always present in serialization but set by the server.

### 2.3 RankedItemInput (API Request Only)

Used in `PUT /users/{user_id}/contexts/{context_id}`.

```json
{
  "venue_id": "string (required)",
  "venue_name": "string (optional, default: venue_id)",
  "visited_at": "2025-06-15T19:30:00+00:00 (required)",
  "occasion_tag": "solo",
  "is_classic": false
}
```

- `venue_name` is optional. If omitted, the server copies `venue_id` into `Venue.name`.
- All other behavior matches `RankedItem`.

### 2.4 TasteContext

```json
{
  "context_id": "default",
  "ranked_list": [<RankedItem>],
  "created_at": "2026-06-22T10:00:00+00:00",
  "updated_at": "2026-06-22T10:00:00+00:00"
}
```

- `context_id` is the key in `TasteProfile.contexts`.

### 2.5 TasteProfile

```json
{
  "user_id": "alice_42",
  "contexts": {
    "default": {<TasteContext>},
    "date_night": {<TasteContext>}
  },
  "default_context": "default"
}
```

- `default_context` **must** exist as a key in `contexts`. Creating a profile without a `default` context is invalid.

---

## 3. API Endpoint Contracts

### 3.1 `POST /users`

**Request:**
```bash
curl -X POST "http://localhost:8000/users" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "alice_42"}'
```

**Response `201`:**
```json
{
  "user_id": "alice_42",
  "contexts": {},
  "default_context": "default"
}
```

**Response `409`:**
```json
{
  "error": "user_exists",
  "message": "User already exists",
  "detail": null
}
```

### 3.2 `GET /users/{user_id}`

**Request:**
```bash
curl "http://localhost:8000/users/alice_42"
```

**Response `200`:** `TasteProfile`

**Response `404`:**
```json
{
  "error": "user_not_found",
  "message": "User not found",
  "detail": {"user_id": "alice_42"}
}
```

### 3.3 `PUT /users/{user_id}/contexts/{context_id}`

**Request:**
```bash
curl -X PUT "http://localhost:8000/users/alice_42/contexts/default" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "venue_id": "venue_001",
      "venue_name": "Golden Bistro",
      "visited_at": "2025-06-15T19:30:00+00:00",
      "occasion_tag": "date",
      "is_classic": true
    }
  ]'
```

**Response `200`:** `TasteContext`

**Response `400`:**
```json
{
  "error": "invalid_context",
  "message": "Invalid context_id or malformed item",
  "detail": {"invalid_item_index": 0}
}
```

### 3.4 `POST /similarity?context_id={id}`

**Request:**
```bash
curl -X POST "http://localhost:8000/similarity?context_id=default" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_a": {<TasteProfile>},
    "profile_b": {<TasteProfile>}
  }'
```

- `context_id` is an **optional query parameter**. If omitted, the server falls back to `profile_a.default_context` and `profile_b.default_context` (they must match, or the server returns `400`).

**Response `200`:**
```json
{
  "distance": 0.35,
  "shared_venues": 4,
  "context_id": "default"
}
```

- `distance` is in `[0.0, 1.0]`. Sentinel `-1.0` is not exposed to the API; it is remapped to a `400` error for insufficient overlap.

**Response `400` (insufficient overlap):**
```json
{
  "error": "insufficient_overlap",
  "message": "Profiles share no venues in the requested context",
  "detail": {"context_id": "default"}
}
```

### 3.5 `POST /clusters/recalculate`

**Request:**
```bash
curl -X POST "http://localhost:8000/clusters/recalculate" \
  -H "Content-Type: application/json" \
  -d '{"context_id": "default"}'
```

**Response `200` / `202`:** `ClusterResult`

```json
{
  "context_id": "default",
  "labels": {"alice_42": 0, "bob_99": 0, "charlie_01": -1},
  "noise_ids": ["charlie_01"],
  "n_clusters": 1,
  "updated_at": "2026-06-22T10:00:00+00:00"
}
```

- `labels` maps `user_id` → integer cluster label. `-1` = noise.
- `noise_ids` is the explicit subset of `labels` with value `-1`.

### 3.6 `GET /recommendations`

**Request:**
```bash
curl "http://localhost:8000/recommendations?user=alice_42&context_id=default&lat=40.7128&lng=-74.0060&cuisine=Italian&diet=vegetarian&price_tier=2&n=5"
```

- Query parameters:
  - `user` (required): `user_id`
  - `context_id` (optional): falls back to user's `default_context`
  - `lat`, `lng` (optional): center for radius filter
  - `cuisine` (optional): exact cuisine string match
  - `diet` (optional): exact dietary tag match
  - `price_tier` (optional): `1`–`4`
  - `n` (optional, default `10`): max results

**Response `200`:** `List[Recommendation]`

```json
[
  {
    "venue": {
      "id": "venue_007",
      "name": "Pasta Palace",
      "location": {"lat": 40.71, "lng": -74.01},
      "cuisines": ["Italian"],
      "dietary_tags": ["vegetarian"],
      "price_tier": 2,
      "health_score": 0.75,
      "source": "synthetic"
    },
    "score": 0.87,
    "explanation": "3 people in your default taste cluster ranked this in their top 3 after visiting Golden Bistro.",
    "context_id": "default"
  }
]
```

- `score` is in `[0.0, 1.0]`.
- `explanation` is non-empty, ≤ 120 characters.

**Response `404`:**
```json
{
  "error": "user_or_context_not_found",
  "message": "User or context not found",
  "detail": {"user": "alice_42", "context_id": "default"}
}
```

---

## 4. Error Response Schema

Every `4xx` / `5xx` response **must** conform to this exact shape:

```json
{
  "error": "string (snake_case error code)",
  "message": "string (human-readable description)",
  "detail": "object or null"
}
```

Rules:
- `error` is machine-readable, stable, and snake_case.
- `message` is human-readable and may be shown in UI toasts.
- `detail` is optional structured data (e.g., invalid field names). Use `null` if no extra detail exists.

---

## 5. Edge Cases & Defaults

| Scenario | Expected Behavior |
|---|---|
| `context_id` omitted in API call | Fall back to `TasteProfile.default_context` |
| `visited_at` omitted in `RankedItemInput` | Default to server `now()` |
| `occasion_tag` omitted | Default to `"solo"` |
| `venue_name` omitted | Default to `venue_id` |
| Duplicate `venue_id` in same `context_id` | Server deduplicates by keeping the most recent `visited_at` |
| Unknown `venue_id` | Server creates a minimal `Venue` with `id` and `name` only |
| `TasteProfile` has no contexts | Valid state after `POST /users`; cluster and rec endpoints return `404` |
| Clustering with < 5 users in context | HDBSCAN returns all noise (`label = -1`) |

---

*Locked against `docs/TDD.md` v0.2. Any API shape change requires a TDD amendment and a new version of this document.*
