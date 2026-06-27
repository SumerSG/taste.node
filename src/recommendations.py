"""taste.node — Phase 5: Recommendation scoring + explanation (MVP)."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from src.models import TasteProfile, Venue, Recommendation
from src.clustering import ContextualClusterMap
from src.similarity import time_decay_weight

# ─── Static MVP venue pool (20 synthetic Tokyo-ish venues) ───

VENUE_POOL: List[Venue] = [
    Venue(id="venue_000", name="Bistro 1", location={"lat": 35.6895, "lng": 139.6917}, cuisines=["Italian"], dietary_tags=["vegetarian"], price_tier=2, health_score=0.8, source="synthetic"),
    Venue(id="venue_001", name="Bistro 2", location={"lat": 35.6586, "lng": 139.7454}, cuisines=["Japanese", "Seafood"], dietary_tags=["fish"], price_tier=3, health_score=0.7, source="synthetic"),
    Venue(id="venue_002", name="Bistro 3", location={"lat": 35.6909, "lng": 139.7004}, cuisines=["Mexican"], dietary_tags=["meat"], price_tier=1, health_score=0.6, source="synthetic"),
    Venue(id="venue_003", name="Bistro 4", location={"lat": 35.6712, "lng": 139.7111}, cuisines=["Indian"], dietary_tags=["vegetarian"], price_tier=2, health_score=0.75, source="synthetic"),
    Venue(id="venue_004", name="Bistro 5", location={"lat": 35.6602, "lng": 139.7292}, cuisines=["French", "Steakhouse"], dietary_tags=["meat"], price_tier=4, health_score=0.65, source="synthetic"),
    Venue(id="venue_005", name="Bistro 6", location={"lat": 35.6823, "lng": 139.7747}, cuisines=["Chinese"], dietary_tags=[], price_tier=1, health_score=0.6, source="synthetic"),
    Venue(id="venue_006", name="Bistro 7", location={"lat": 35.6485, "lng": 139.7013}, cuisines=["Korean"], dietary_tags=["meat"], price_tier=2, health_score=0.7, source="synthetic"),
    Venue(id="venue_007", name="Bistro 8", location={"lat": 35.6721, "lng": 139.7345}, cuisines=["Thai"], dietary_tags=["fish"], price_tier=2, health_score=0.72, source="synthetic"),
    Venue(id="venue_008", name="Bistro 9", location={"lat": 35.6615, "lng": 139.7311}, cuisines=["Middle Eastern"], dietary_tags=["vegetarian"], price_tier=2, health_score=0.78, source="synthetic"),
    Venue(id="venue_009", name="Bistro 10", location={"lat": 35.6789, "lng": 139.7583}, cuisines=["Seafood"], dietary_tags=["pescatarian"], price_tier=3, health_score=0.68, source="synthetic"),
    Venue(id="venue_010", name="Bistro 11", location={"lat": 35.6512, "lng": 139.6891}, cuisines=["Steakhouse"], dietary_tags=["meat"], price_tier=4, health_score=0.55, source="synthetic"),
    Venue(id="venue_011", name="Bistro 12", location={"lat": 35.6834, "lng": 139.7134}, cuisines=["Vegetarian", "Vegan"], dietary_tags=["vegan", "vegetarian"], price_tier=2, health_score=0.95, source="synthetic"),
    Venue(id="venue_012", name="Bistro 13", location={"lat": 35.6456, "lng": 139.6998}, cuisines=["Bakery"], dietary_tags=[], price_tier=1, health_score=0.5, source="synthetic"),
    Venue(id="venue_013", name="Bistro 14", location={"lat": 35.6698, "lng": 139.7467}, cuisines=["Taiwanese"], dietary_tags=[], price_tier=1, health_score=0.62, source="synthetic"),
    Venue(id="venue_014", name="Bistro 15", location={"lat": 35.6912, "lng": 139.7267}, cuisines=["Nordic"], dietary_tags=["fish"], price_tier=4, health_score=0.8, source="synthetic"),
    Venue(id="venue_015", name="Bistro 16", location={"lat": 35.6567, "lng": 139.7201}, cuisines=["Italian", "Pasta"], dietary_tags=["vegetarian"], price_tier=2, health_score=0.74, source="synthetic"),
    Venue(id="venue_016", name="Bistro 17", location={"lat": 35.6745, "lng": 139.7856}, cuisines=["Japanese"], dietary_tags=["fish"], price_tier=3, health_score=0.76, source="synthetic"),
    Venue(id="venue_017", name="Bistro 18", location={"lat": 35.6623, "lng": 139.7056}, cuisines=["Indian", "Vegan"], dietary_tags=["vegan", "vegetarian"], price_tier=2, health_score=0.88, source="synthetic"),
    Venue(id="venue_018", name="Bistro 19", location={"lat": 35.6489, "lng": 139.7389}, cuisines=["Chinese", "Korean"], dietary_tags=["meat"], price_tier=2, health_score=0.66, source="synthetic"),
    Venue(id="venue_019", name="Bistro 20", location={"lat": 35.6801, "lng": 139.7567}, cuisines=["French"], dietary_tags=["vegetarian"], price_tier=3, health_score=0.71, source="synthetic"),
]


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

    # Clustering
    cluster_engine = ContextualClusterMap(all_profiles, min_cluster_size=5)
    cluster_result = cluster_engine.fit_context(context_id)
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
