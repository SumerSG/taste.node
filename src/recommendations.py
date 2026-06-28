"""taste.node — Recommendation scoring + explanation (MVP)."""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from src.models import TasteProfile, Venue, Recommendation, ClusterResult
from src.clustering import ContextualClusterMap
from src.similarity import time_decay_weight

# ─── Cluster cache ───
_cluster_cache: Dict[str, tuple[ClusterResult, datetime]] = {}
_CLUSTER_CACHE_TTL = timedelta(minutes=5)


def _get_cached_cluster(context_id: str) -> Optional[ClusterResult]:
    cached = _cluster_cache.get(context_id)
    if cached is None:
        return None
    result, ts = cached
    if datetime.now(timezone.utc) - ts > _CLUSTER_CACHE_TTL:
        del _cluster_cache[context_id]
        return None
    return result


def _set_cached_cluster(context_id: str, result: ClusterResult) -> None:
    _cluster_cache[context_id] = (result, datetime.now(timezone.utc))


def _invalidate_cluster_cache(context_id: str) -> None:
    _cluster_cache.pop(context_id, None)

# ─── Load venue pool from JSON (shared with frontend) ───

_VENUE_JSON_PATH = Path(__file__).resolve().parent / "data" / "venues.json"


def _load_venue_pool() -> List[Venue]:
    """Load all venues from the shared JSON file."""
    venues: list[Venue] = []
    if not _VENUE_JSON_PATH.exists():
        return venues
    try:
        with _VENUE_JSON_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return venues
    for raw in data:
        loc = raw.get("location")
        if raw.get("lat") is not None and raw.get("lng") is not None:
            loc = {"lat": raw["lat"], "lng": raw["lng"]}
        try:
            venues.append(
                Venue(
                    id=raw.get("venue_id") or raw.get("id", ""),
                    name=raw.get("name", ""),
                    location=loc,
                    cuisines=raw.get("cuisines", []),
                    dietary_tags=raw.get("dietary_tags", []),
                    price_tier=raw.get("price_tier"),
                    health_score=raw.get("health_score"),
                    source=raw.get("source", "synthetic"),  # type: ignore[arg-type]
                    source_url=raw.get("source_url"),
                    address=raw.get("address"),
                    image_url=raw.get("image_url"),
                    rating=raw.get("rating"),
                    review_count=raw.get("review_count"),
                )
            )
        except Exception:
            continue
    return venues


VENUE_POOL: List[Venue] = _load_venue_pool()


def _haversine(a: Dict[str, float], b: Dict[str, float]) -> float:
    from math import radians, sin, cos, sqrt, atan2
    R = 6371.0
    dlat = radians(b["lat"] - a["lat"])
    dlng = radians(b["lng"] - a["lng"])
    lat1 = radians(a["lat"])
    lat2 = radians(b["lat"])
    x = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return R * 2 * atan2(sqrt(x), sqrt(1 - x))


def _extract_candidate_venues(
    existing_ids: Set[str],
    all_profiles: List[TasteProfile],
    context_id: str,
) -> List[Venue]:
    """Return deduplicated venues not already ranked by the user."""
    seen: Set[str] = set(existing_ids)
    candidates: List[Venue] = []
    for v in VENUE_POOL:
        if v.id not in seen:
            seen.add(v.id)
            candidates.append(v)
    for p in all_profiles:
        ctx = p.contexts.get(context_id)
        if not ctx:
            continue
        for item in ctx.ranked_list:
            if item.venue.id not in seen:
                seen.add(item.venue.id)
                candidates.append(item.venue)
    return candidates


def score_recommendations(
    user: TasteProfile,
    context_id: str,
    all_profiles: List[TasteProfile],
    filters: Optional[Dict[str, Any]] = None,
    n: int = 10,
) -> List[Recommendation]:
    """Generate contextual recommendations for *user* in *context_id*."""
    _filters = filters or {}
    ctx = user.contexts.get(context_id)
    if not ctx:
        return []

    existing_ids: Set[str] = {r.venue.id for r in ctx.ranked_list}
    candidates = _extract_candidate_venues(existing_ids, all_profiles, context_id)

    # Apply filters
    cuisine_filter = _filters.get("cuisine")
    diet_filter = _filters.get("diet")
    price_filter = _filters.get("price_tier")
    lat = _filters.get("lat")
    lng = _filters.get("lng")
    radius = _filters.get("radius_km", 50.0)

    filtered: List[Venue] = []
    for v in candidates:
        if cuisine_filter and not any(cuisine_filter.lower() in c.lower() for c in v.cuisines):
            continue
        if diet_filter and diet_filter not in v.dietary_tags:
            continue
        if price_filter is not None and v.price_tier != price_filter:
            continue
        if lat is not None and lng is not None and radius is not None and v.location:
            if _haversine({"lat": lat, "lng": lng}, v.location) > radius:
                continue
        filtered.append(v)

    # Clustering (cached per context_id with 5-minute TTL)
    cluster_result = _get_cached_cluster(context_id)
    if cluster_result is None:
        cluster_engine = ContextualClusterMap(all_profiles, min_cluster_size=5)
        cluster_result = cluster_engine.fit_context(context_id)
        _set_cached_cluster(context_id, cluster_result)
    user_label = cluster_result.labels.get(user.user_id)
    cluster_member_ids = [
        uid for uid, lab in cluster_result.labels.items()
        if lab != -1 and uid != user.user_id and lab == user_label
    ]

    now = datetime.now(timezone.utc)
    scored: List[Recommendation] = []

    for venue in filtered:
        score = 0.0

        # α · cluster_affinity
        if user_label is not None and user_label != -1:
            affinity = 0.0
            for peer_id in cluster_member_ids:
                peer = next((p for p in all_profiles if p.user_id == peer_id), None)
                if not peer:
                    continue
                p_ctx = peer.contexts.get(context_id)
                if not p_ctx:
                    continue
                for idx, item in enumerate(p_ctx.ranked_list):
                    if item.venue.id == venue.id:
                        affinity += 1.0 / (idx + 1)
                        break
            score += 0.5 * min(affinity, 1.0)
        else:
            user_cuisines: Set[str] = set()
            for item in ctx.ranked_list:
                user_cuisines.update(item.venue.cuisines)
            overlap = len([c for c in venue.cuisines if c in user_cuisines])
            score += 0.3 * min(overlap / max(len(user_cuisines), 1), 1.0)

        # β · filter_match
        filter_score = 0.0
        if cuisine_filter and any(cuisine_filter.lower() in c.lower() for c in venue.cuisines):
            filter_score += 0.3
        if diet_filter and diet_filter in venue.dietary_tags:
            filter_score += 0.3
        if price_filter is not None and venue.price_tier == price_filter:
            filter_score += 0.2
        score += 0.3 * min(filter_score, 1.0)

        # γ · temporal_boost
        recency: List[float] = []
        for peer_id in cluster_member_ids:
            peer = next((p for p in all_profiles if p.user_id == peer_id), None)
            if not peer:
                continue
            p_ctx = peer.contexts.get(context_id)
            if not p_ctx:
                continue
            for item in p_ctx.ranked_list:
                if item.venue.id == venue.id:
                    recency.append(time_decay_weight(item.visited_at, now, is_classic=item.is_classic))
                    break
        if recency:
            recency.sort()
            median = recency[len(recency) // 2]
            score += 0.2 * median

        score = min(score, 0.98)

        if user_label is not None and user_label != -1 and cluster_member_ids:
            explanation = (
                f"{len(cluster_member_ids)} people in your {context_id} taste cluster "
                f"ranked this in their top 3."
            )
        else:
            matched = []
            if cuisine_filter:
                matched.append(cuisine_filter)
            if diet_filter:
                matched.append(diet_filter)
            matched_str = ", ".join(matched) if matched else "your filters"
            explanation = f"This matches {matched_str} and is trending nearby."

        scored.append(
            Recommendation(
                venue=venue,
                score=round(score, 2),
                explanation=explanation,
                context_id=context_id,
            )
        )

    scored.sort(key=lambda r: r.score, reverse=True)
    return scored[:n]
