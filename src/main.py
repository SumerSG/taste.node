"""taste.node — Phase 5: FastAPI surface.

Boundary rule: routes only. All business logic delegates to
src/db.py, src/similarity.py, src/clustering.py, src/recommendations.py.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Depends, Query, Body, Request, Header, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from src.models import (
    TasteProfile,
    TasteContext,
    RankedItemInput,
    ClusterResult,
    Recommendation,
    ErrorResponse,
    Venue,
    SettingsUpdate,
)
from src.db import (
    get_db,
    get_user_profile,
    create_user,
    update_user_settings,
    upsert_context,
    get_all_profiles,
    get_all_venues,
    seed_venues_if_empty,
)
from src.similarity import compute_similarity
from src.clustering import ContextualClusterMap
from src.recommendations import score_recommendations
from src.mock_database import get_mock_users, seed_synthetic_profiles, clear_mock_data

# ─── Rate limiting ───
# 30 req/min default; 100/min for recommendations
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="taste.node API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ─── Health / Root ───
@app.get("/")
def root():
    return {"status": "ok", "service": "taste.node"}


# ─── CORS ───
# Default: localhost dev origins. Override with TASTE_NODE_CORS_ORIGINS env var.
_default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]
_cors_env = os.environ.get("TASTE_NODE_CORS_ORIGINS")
allow_origins = _cors_env.split(",") if _cors_env else _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ─── Shared state (MVP: in-memory cluster cache) ───
_cluster_cache: Dict[str, ClusterResult] = {}


def _error(status_code: int, error: str, message: str, detail: Optional[Dict[str, Any]] = None):
    raise HTTPException(
        status_code=status_code,
        detail=ErrorResponse(error=error, message=message, detail=detail).model_dump(),
    )


# ─── API Key guard (MOC for mutation endpoints) ───
# If TASTE_NODE_API_KEY is unset, mutations are open (local dev).
# If set, the matching X-API-Key header is required.


def require_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")) -> None:
    expected = os.environ.get("TASTE_NODE_API_KEY")
    if expected and x_api_key != expected:
        _error(
            status.HTTP_403_FORBIDDEN,
            "forbidden",
            "Invalid or missing API key.",
            detail={"header": "X-API-Key"},
        )



# ─── Users ───

@app.post("/users", status_code=201, response_model=TasteProfile)
@limiter.limit("30/minute")
def create_new_user(request: Request, payload: Dict[str, str] = Body(...), conn: Any = Depends(get_db), _auth: None = Depends(require_api_key)):
    user_id = payload.get("user_id")
    if not user_id:
        _error(400, "missing_field", "user_id is required")
    existing = get_user_profile(conn, user_id)
    if existing:
        _error(409, "user_exists", "User already exists")
    return create_user(conn, user_id)


@app.get("/users/{user_id}", response_model=TasteProfile)
@limiter.limit("30/minute")
def read_user(request: Request, user_id: str, conn: Any = Depends(get_db)):
    profile = get_user_profile(conn, user_id)
    if not profile:
        _error(404, "user_not_found", "User not found", detail={"user_id": user_id})
    return profile


@app.patch("/users/{user_id}/settings")
@limiter.limit("30/minute")
def patch_user_settings(
    request: Request,
    user_id: str,
    payload: SettingsUpdate,
    conn: Any = Depends(get_db),
    _auth: None = Depends(require_api_key),
):
    profile = get_user_profile(conn, user_id)
    if not profile:
        _error(404, "user_not_found", "User not found", detail={"user_id": user_id})
    update_user_settings(conn, user_id, payload.include_in_clustering)
    # Return updated profile
    updated = get_user_profile(conn, user_id)
    return updated


# ─── Contexts / Ranked Lists ───

@app.put("/users/{user_id}/contexts/{context_id}", response_model=TasteContext)
@limiter.limit("30/minute")
def update_context(
    request: Request,
    user_id: str,
    context_id: str,
    items: List[RankedItemInput],
    conn: Any = Depends(get_db),
    _auth: None = Depends(require_api_key),
):
    if not items:
        _error(400, "invalid_context", "Empty item list", detail={"invalid_item_index": None})
    # Validate inputs
    for idx, item in enumerate(items):
        if not item.venue_id:
            _error(
                400,
                "invalid_context",
                "venue_id is required",
                detail={"invalid_item_index": idx},
            )
    return upsert_context(conn, user_id, context_id, items)


# ─── Similarity ───

@app.post("/similarity")
@limiter.limit("30/minute")
def compute_similarity_endpoint(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    context_id: Optional[str] = Query(None),
):
    try:
        profile_a = TasteProfile.model_validate(payload.get("profile_a"))
        profile_b = TasteProfile.model_validate(payload.get("profile_b"))
    except Exception:
        _error(400, "invalid_profile", "Malformed TasteProfile in request body")

    resolved = context_id or profile_a.default_context
    if resolved != (context_id or profile_b.default_context):
        _error(400, "context_mismatch", "Profiles must use the same default_context")

    distance = compute_similarity(profile_a, profile_b, resolved)
    if distance < 0:
        _error(
            400,
            "insufficient_overlap",
            "Profiles share no venues in the requested context",
            detail={"context_id": resolved},
        )

    # Count shared venues for response enrichment
    a_ctx = profile_a.contexts.get(resolved)
    b_ctx = profile_b.contexts.get(resolved)
    shared = 0
    if a_ctx and b_ctx:
        a_ids = {r.venue.id for r in a_ctx.ranked_list}
        b_ids = {r.venue.id for r in b_ctx.ranked_list}
        shared = len(a_ids & b_ids)

    return JSONResponse(
        content={"distance": distance, "shared_venues": shared, "context_id": resolved}
    )


# ─── Clusters ───

@app.post("/clusters/recalculate", response_model=ClusterResult)
@limiter.limit("10/minute")
def recalculate_clusters(
    request: Request,
    payload: Dict[str, str] = Body(...),
    conn: Any = Depends(get_db),
    _auth: None = Depends(require_api_key),
):
    cid = payload.get("context_id")
    if not cid:
        _error(400, "missing_field", "context_id is required")

    all_profiles = get_all_profiles(conn)
    engine = ContextualClusterMap(all_profiles, min_cluster_size=5)
    result = engine.fit_context(cid)
    _cluster_cache[cid] = result
    return result


# ─── Recommendations ───

@app.get("/recommendations")
@limiter.limit("100/minute")
def get_recommendations(
    request: Request,
    user: str = Query(...),
    context_id: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    cuisine: Optional[str] = Query(None),
    diet: Optional[str] = Query(None),
    price_tier: Optional[int] = Query(None),
    with_users: Optional[List[str]] = Query(None),
    n: int = Query(10),
    conn: Any = Depends(get_db),
):
    profile = get_user_profile(conn, user)
    if not profile:
        _error(
            404,
            "user_or_context_not_found",
            "User or context not found",
            detail={"user": user, "context_id": context_id},
        )

    resolved = context_id or profile.default_context
    if resolved not in profile.contexts:
        _error(
            404,
            "user_or_context_not_found",
            "User or context not found",
            detail={"user": user, "context_id": resolved},
        )

    all_profiles = get_all_profiles(conn)
    filters: Dict[str, Any] = {}
    if cuisine:
        filters["cuisine"] = cuisine
    if diet:
        filters["diet"] = diet
    if price_tier is not None:
        filters["price_tier"] = price_tier
    if lat is not None:
        filters["lat"] = lat
    if lng is not None:
        filters["lng"] = lng
    if with_users:
        filters["with_users"] = with_users

    recs = score_recommendations(profile, resolved, all_profiles, filters=filters, n=n)
    return recs


# ─── Venues ───

@app.get("/venues")
@limiter.limit("100/minute")
def list_venues(request: Request, conn: Any = Depends(get_db)):
    """Return all venues from the database, seeding from the static pool if empty."""
    venues = get_all_venues(conn)
    if not venues:
        seed_venues_if_empty(conn)
        venues = get_all_venues(conn)
    return venues


# ─── Mock Database (demo-only) ───

@app.get("/mock/users")
@limiter.limit("30/minute")
def list_mock_users(request: Request):
    return get_mock_users()


@app.post("/mock/seed")
@limiter.limit("10/minute")
def seed_mock_data(
    request: Request,
    payload: Dict[str, Any] = Body(default={}),
    conn: Any = Depends(get_db),
    _auth: None = Depends(require_api_key),
):
    try:
        n = int(payload.get("n", 100))
    except (TypeError, ValueError):
        n = 100
    try:
        seed = int(payload.get("seed", 42))
    except (TypeError, ValueError):
        seed = 42
    count = seed_synthetic_profiles(conn, n=n, seed=seed)
    return {"status": "ok", "seeded": count}


@app.delete("/mock/seed")
@limiter.limit("10/minute")
def clear_mock_data_endpoint(
    request: Request,
    conn: Any = Depends(get_db),
    _auth: None = Depends(require_api_key),
):
    count = clear_mock_data(conn)
    return {"status": "ok", "cleared_rows": count}
