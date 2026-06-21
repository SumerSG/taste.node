from typing import Dict, List, Optional
from fastapi import FastAPI, Query

from .models import TasteProfile, RankedItem
from .similarity import kendall_similarity, kendall_distance
from .clustering import ContextualClusterMap
from .synthetic_data import generate_synthetic_profiles

app = FastAPI(title="taste.node")

# In-memory synthetic dataset (Phase 1: demo-only)
_data_store: Dict[str, TasteProfile] = {}
_cluster_map: Optional[ContextualClusterMap] = None


def _get_or_create_dataset() -> ContextualClusterMap:
    global _data_store, _cluster_map
    if _cluster_map is None:
        profiles = generate_synthetic_profiles(n_users=30, seed=42)
        _data_store = {p.user_id: p for p in profiles}
        _cluster_map = ContextualClusterMap(profiles, min_cluster_size=3)
        _cluster_map.fit_all_contexts()
    return _cluster_map


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/similarity")
def compute_similarity(
    profile_a: TasteProfile,
    profile_b: TasteProfile,
    context_id: Optional[str] = Query(None, description="Context to compare within. Defaults to each profile's default_context."),
):
    """
    Compute contextual Kendall similarity between two taste profiles.
    Returns None for no overlap (no shared venues) rather than conflating
    it with total disagreement.
    """
    cid = context_id or profile_a.default_context
    score = kendall_similarity(profile_a, profile_b, context_id=cid)
    dist = kendall_distance(profile_a, profile_b, context_id=cid)
    shared_count = 0
    items_a = profile_a.get_items(context_id=cid, apply_decay=False)
    items_b = profile_b.get_items(context_id=cid, apply_decay=False)
    ids_a = {i.venue.id for i in items_a}
    ids_b = {i.venue.id for i in items_b}
    shared_count = len(ids_a & ids_b)

    return {
        "context_id": cid,
        "similarity": score,
        "distance": dist,
        "shared_venues": shared_count,
        "interpretation": (
            "no overlap" if score is None else
            "total disagreement" if dist == 1.0 else
            "weak similarity" if score < 0.3 else
            "moderate similarity" if score < 0.6 else
            "strong similarity"
        ),
    }


@app.post("/recommendations")
def recommendations(
    profile: TasteProfile,
    context_id: Optional[str] = Query(None, description="Taste context to base recommendations on. Falls back to default_context."),
    n: int = Query(5, ge=1, le=20),
):
    """
    Contextual recommendation endpoint.

    Uses cluster affinity within the requested context. Falls back to
    default_context if none provided. Noise users (no cluster) receive
    popularity-based suggestions from their context.
    """
    cmap = _get_or_create_dataset()
    cid = context_id or profile.default_context

    user_label = cmap.get_label(profile.user_id, cid)
    items = profile.get_items(context_id=cid, apply_decay=True)
    user_venue_ids = {i.venue.id for i in items}

    # Gather candidate venues from other users in the same cluster
    candidates: List[RankedItem] = []
    if user_label is not None and user_label != -1:
        for uid, other_profile in cmap.profiles.items():
            if uid == profile.user_id:
                continue
            other_label = cmap.get_label(uid, cid)
            if other_label == user_label:
                other_items = other_profile.get_items(context_id=cid, apply_decay=True)
                for item in other_items:
                    if item.venue.id not in user_venue_ids:
                        candidates.append(item)
    else:
        # Noise / cold-start: sample from all profiles in this context
        for uid, other_profile in cmap.profiles.items():
            if uid == profile.user_id:
                continue
            other_items = other_profile.get_items(context_id=cid, apply_decay=True)
            for item in other_items:
                if item.venue.id not in user_venue_ids:
                    candidates.append(item)

    # Deduplicate by venue id, keeping the highest derived-rank occurrence
    seen: Dict[str, RankedItem] = {}
    for item in candidates:
        if item.venue.id not in seen:
            seen[item.venue.id] = item
    deduped = list(seen.values())

    # Scoring: derived rank score of the recommending user (proxy for quality)
    deduped.sort(key=lambda i: i.compute_derived_rank(), reverse=True)
    top_n = deduped[:n]

    return {
        "context_id": cid,
        "cluster_label": user_label,
        "recommendations": [
            {
                "venue": item.venue.model_dump(),
                "occasion_tag": item.occasion_tag,
                "visited_at": item.visited_at.isoformat(),
            }
            for item in top_n
        ],
    }


@app.post("/cluster/assign")
def assign_cluster(
    profile: TasteProfile,
    context_id: Optional[str] = Query(None, description="Context to evaluate. Defaults to default_context."),
):
    """
    Evaluate which contextual cluster a profile belongs to.
    Returns -1 if the profile is treated as noise in that context.
    """
    cmap = _get_or_create_dataset()
    cid = context_id or profile.default_context
    # Ensure clustering exists for this context
    if cid not in cmap.context_clusters:
        cmap.fit_context(cid)

    label = cmap.get_label(profile.user_id, cid)
    if label is None:
        # Profile not in synthetic dataset; compute ad-hoc against known profiles
        dists = []
        for uid, other in cmap.profiles.items():
            d = kendall_distance(profile, other, context_id=cid)
            if d is not None:
                dists.append((d, cmap.get_label(uid, cid)))
        if not dists:
            label = -1
        else:
            # Assign to the cluster of the nearest non-noise neighbor
            dists.sort(key=lambda x: x[0])
            label = dists[0][1] if dists[0][1] != -1 else (-1 if len(dists) == 1 or dists[1][1] == -1 else dists[1][1])

    return {
        "context_id": cid,
        "cluster_label": label,
        "status": "noise (outlier)" if label == -1 else "clustered",
    }
