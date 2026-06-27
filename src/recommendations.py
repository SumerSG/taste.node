"""taste.node — Recommendation scoring + explanation (MVP)."""

from datetime import datetime, timezone, timedelta
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

# ─── Static MVP venue pool (20 synthetic Tokyo-ish venues) ───

VENUE_POOL: List[Venue] = [
    Venue(id="v1", name="Nakameguro Kiriko", address="東京都目黒区上目黒2-19-1", location={"lat": 35.6415, "lng": 139.6981}, cuisines=["居酒屋", "焼き鳥"], dietary_tags=[], price_tier=2, health_score=0.6, source="tabelog", source_url="https://tabelog.com/tokyo/A1317/A131701/13197554/", image_url="https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop", rating=3.58, review_count=142),
    Venue(id="v2", name="Shibuya Yakiniku Jumbo", address="東京都渋谷区道玄坂1-6-6", location={"lat": 35.6592, "lng": 139.7003}, cuisines=["焼肉", "居酒屋"], dietary_tags=["meat"], price_tier=3, health_score=0.5, source="tabelog", source_url="https://tabelog.com/tokyo/A1303/A130301/13002285/", image_url="https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop", rating=3.72, review_count=389),
    Venue(id="v3", name="Ramen Jiro Meguro", address="東京都目黒区目黒1-3-18", location={"lat": 35.6339, "lng": 139.7157}, cuisines=["ラーメン"], dietary_tags=["meat"], price_tier=1, health_score=0.3, source="tabelog", source_url="https://tabelog.com/tokyo/A1317/A131701/13168407/", image_url="https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop", rating=3.51, review_count=567),
    Venue(id="v4", name="Sushi Saito", address="東京都港区六本木1-4-5", location={"lat": 35.6628, "lng": 139.7394}, cuisines=["寿司", "日本料理"], dietary_tags=["fish"], price_tier=4, health_score=0.8, source="tabelog", source_url="https://tabelog.com/tokyo/A1307/A130701/13015333/", image_url="https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop", rating=4.77, review_count=203),
    Venue(id="v5", name="Trattoria Dal Biassanot", address="東京都渋谷区恵比寿1-30-10", location={"lat": 35.6467, "lng": 139.7101}, cuisines=["イタリアン", "パスタ"], dietary_tags=["vegetarian"], price_tier=2, health_score=0.7, source="tabelog", source_url="https://tabelog.com/tokyo/A1303/A130302/13007789/", image_url="https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=600&h=400&fit=crop", rating=3.48, review_count=198),
    Venue(id="v6", name="T's Restaurant", address="東京都渋谷区神宮前6-28-5", location={"lat": 35.6614, "lng": 139.7041}, cuisines=["カフェ", "ベジタリアン"], dietary_tags=["vegan", "vegetarian"], price_tier=2, health_score=0.9, source="tabelog", source_url="https://tabelog.com/tokyo/A1306/A130602/13038092/", image_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop", rating=3.62, review_count=312),
    Venue(id="v7", name="Narisawa", address="東京都港区南青山2-6-15", location={"lat": 35.6713, "lng": 139.7188}, cuisines=["創作料理", "フレンチ"], dietary_tags=["vegetarian"], price_tier=4, health_score=0.85, source="tabelog", source_url="https://tabelog.com/tokyo/A1306/A130602/13001570/", image_url="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop", rating=4.65, review_count=445),
    Venue(id="v8", name="Harajuku Gyoza Lou", address="東京都渋谷区神宮前6-2-4", location={"lat": 35.6701, "lng": 139.7026}, cuisines=["中華料理", "餃子"], dietary_tags=["meat"], price_tier=1, health_score=0.55, source="tabelog", source_url="https://tabelog.com/tokyo/A1306/A130602/13001688/", image_url="https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop", rating=3.44, review_count=876),
    Venue(id="v9", name="Afuri", address="東京都港区六本木6-2-31", location={"lat": 35.6605, "lng": 139.7292}, cuisines=["ラーメン", "和食"], dietary_tags=["meat"], price_tier=1, health_score=0.6, source="tabelog", source_url="https://tabelog.com/tokyo/A1307/A130701/13015402/", image_url="https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop", rating=3.38, review_count=654),
    Venue(id="v10", name="Teppanyaki Nakamura", address="東京都新宿区西新宿3-7-1", location={"lat": 35.6852, "lng": 139.6926}, cuisines=["鉄板焼き", "ステーキ"], dietary_tags=["meat"], price_tier=4, health_score=0.65, source="tabelog", source_url="https://tabelog.com/tokyo/A1304/A130401/13001993/", image_url="https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop", rating=4.21, review_count=178),
    Venue(id="v11", name="Tonkatsu Maisen", address="東京都渋谷区神宮前4-8-5", location={"lat": 35.6671, "lng": 139.7054}, cuisines=["和食", "とんかつ"], dietary_tags=["meat"], price_tier=2, health_score=0.5, source="tabelog", source_url="https://tabelog.com/tokyo/A1306/A130602/13001809/", image_url="https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop", rating=3.56, review_count=934),
    Venue(id="v12", name="Luke's Lobster", address="東京都渋谷区神宮前6-7-1", location={"lat": 35.6655, "lng": 139.7062}, cuisines=["アメリカ料理", "シーフード"], dietary_tags=["pescatarian"], price_tier=2, health_score=0.7, source="tabelog", source_url="https://tabelog.com/tokyo/A1306/A130602/13040551/", image_url="https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&h=400&fit=crop", rating=3.32, review_count=543),
    Venue(id="v13", name="Gonpachi Nishiazabu", address="東京都港区西麻布1-13-11", location={"lat": 35.6598, "lng": 139.7228}, cuisines=["居酒屋", "和食"], dietary_tags=["meat"], price_tier=2, health_score=0.6, source="tabelog", source_url="https://tabelog.com/tokyo/A1307/A130701/13002547/", image_url="https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop", rating=3.41, review_count=421),
    Venue(id="v14", name="Sangenjaya Curry Kusamura", address="東京都世田谷区三軒茶屋1-32-10", location={"lat": 35.6407, "lng": 139.6688}, cuisines=["カレー", "インド料理"], dietary_tags=["vegetarian"], price_tier=1, health_score=0.75, source="tabelog", source_url="https://tabelog.com/tokyo/A1317/A131706/13177452/", image_url="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=400&fit=crop", rating=3.62, review_count=267),
    Venue(id="v15", name="Den", address="東京都渋谷区神宮前2-3-18", location={"lat": 35.6718, "lng": 139.7109}, cuisines=["創作料理", "居酒屋"], dietary_tags=["meat"], price_tier=3, health_score=0.8, source="tabelog", source_url="https://tabelog.com/tokyo/A1306/A130602/13001407/", image_url="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop", rating=4.58, review_count=334),
    Venue(id="v16", name="Robataya Shinjuku", address="東京都新宿区西新宿7-14-14", location={"lat": 35.6938, "lng": 139.6987}, cuisines=["炉端焼き", "海鮮"], dietary_tags=["fish"], price_tier=3, health_score=0.7, source="tabelog", source_url="https://tabelog.com/tokyo/A1304/A130401/13112678/", image_url="https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&h=400&fit=crop", rating=4.12, review_count=289),
    Venue(id="v17", name="Pizza Strada", address="東京都渋谷区笹塚1-55-16", location={"lat": 35.6744, "lng": 139.6664}, cuisines=["イタリアン", "ピザ"], dietary_tags=["vegetarian"], price_tier=1, health_score=0.6, source="tabelog", source_url="https://tabelog.com/tokyo/A1319/A131905/13141429/", image_url="https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=600&h=400&fit=crop", rating=3.71, review_count=412),
    Venue(id="v18", name="Korean BBQ Seoul", address="東京都新宿区歌舞伎町2-32-1", location={"lat": 35.6952, "lng": 139.7028}, cuisines=["韓国料理", "焼肉"], dietary_tags=["meat"], price_tier=2, health_score=0.55, source="tabelog", source_url="https://tabelog.com/tokyo/A1304/A130401/13006697/", image_url="https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=400&fit=crop", rating=3.65, review_count=356),
    Venue(id="v19", name="Salad Kitchen Omotesando", address="東京都渋谷区神宮前5-12-3", location={"lat": 35.6651, "lng": 139.7098}, cuisines=["サラダ", "ベジタリアン"], dietary_tags=["vegan", "vegetarian"], price_tier=1, health_score=0.95, source="tabelog", source_url="https://tabelog.com/tokyo/A1306/A130602/13042682/", image_url="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop", rating=3.89, review_count=223),
    Venue(id="v20", name="Taipei Shokudo", address="東京都千代田区神田須田町1-16-12", location={"lat": 35.6987, "lng": 139.7729}, cuisines=["台湾料理"], dietary_tags=[], price_tier=1, health_score=0.65, source="tabelog", source_url="https://tabelog.com/tokyo/A1310/A131003/13056120/", image_url="https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop", rating=3.55, review_count=188),
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
