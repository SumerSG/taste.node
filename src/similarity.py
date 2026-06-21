from typing import List, Optional, Tuple
from datetime import datetime, timezone
from scipy.stats import kendalltau
import math

from .models import TasteProfile, RankedItem


def extract_shared_venues(
    items_a: List[RankedItem],
    items_b: List[RankedItem],
) -> Tuple[List[int], List[int], List[float]]:
    """
    Build two rank lists for venues that appear in BOTH lists.
    Only overlapping venues participate in similarity.
    Returns (ranks_a, ranks_b, weights) where weights incorporate time decay.
    """
    ranks_a: dict[str, int] = {item.venue.id: idx + 1 for idx, item in enumerate(items_a)}
    ranks_b: dict[str, int] = {item.venue.id: idx + 1 for idx, item in enumerate(items_b)}

    shared_ids = sorted(set(ranks_a.keys()) & set(ranks_b.keys()))

    list_a = [ranks_a[vid] for vid in shared_ids]
    list_b = [ranks_b[vid] for vid in shared_ids]

    # Compute time-decay weights based on the *older* of the two visits
    weights = []
    now = datetime.now(timezone.utc)
    for vid in shared_ids:
        item_a = next(i for i in items_a if i.venue.id == vid)
        item_b = next(i for i in items_b if i.venue.id == vid)
        age_a_days = max(0.0, (now - item_a.visited_at).total_seconds() / 86400.0)
        age_b_days = max(0.0, (now - item_b.visited_at).total_seconds() / 86400.0)
        # Use average age; older shared experiences get lower weight
        avg_age = (age_a_days + age_b_days) / 2.0
        halflife = 365.0
        weight = 2.0 ** (-avg_age / halflife)
        weights.append(weight)

    return list_a, list_b, weights


def kendall_distance(
    a: TasteProfile,
    b: TasteProfile,
    context_id: Optional[str] = None,
) -> Optional[float]:
    """
    Returns the normalized Kendall Tau distance in [0, 1].

    - None  => no shared venues (no data / no overlap)
    - 0.0   => identical ranking
    - 1.0   => total disagreement (inverse ranking)

    This distinguishes "No overlap" (return None) from
    "Total disagreement" (return 1.0).  The NaN guard from the
    previous implementation is replaced with proper distance
    normalization: distance = (1 - tau) / 2.
    """
    items_a = a.get_items(context_id=context_id, apply_decay=False)
    items_b = b.get_items(context_id=context_id, apply_decay=False)

    list_a, list_b, weights = extract_shared_venues(items_a, items_b)

    if len(list_a) < 2:
        # Fewer than 2 shared venues: insufficient information
        return None

    tau, _ = kendalltau(list_a, list_b)
    if tau is None or math.isnan(tau):
        return None

    # Normalize Kendall Tau [-1, 1] into proper distance [0, 1]
    distance = (1.0 - float(tau)) / 2.0
    return distance


def kendall_similarity(
    a: TasteProfile,
    b: TasteProfile,
    context_id: Optional[str] = None,
) -> Optional[float]:
    """
    Similarity wrapper: returns 1 - distance.
    None propagates for no overlap.
    """
    dist = kendall_distance(a, b, context_id=context_id)
    if dist is None:
        return None
    return 1.0 - dist
