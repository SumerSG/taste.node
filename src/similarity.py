from typing import List, Dict
from scipy.stats import kendalltau
from .models import TasteProfile


def extract_shared_venues(a: TasteProfile, b: TasteProfile) -> tuple[List[int], List[int]]:
    """
    Build two rank lists for venues that appear in BOTH profiles.
    Only overlapping venues participate in similarity.
    Missing venues are ignored — this is standard for partial ranked lists.
    """
    ranks_a: Dict[str, int] = {item.venue.id: item.rank for item in a.ranked_list}
    ranks_b: Dict[str, int] = {item.venue.id: item.rank for item in b.ranked_list}

    shared_ids = sorted(set(ranks_a.keys()) & set(ranks_b.keys()))

    list_a = [ranks_a[vid] for vid in shared_ids]
    list_b = [ranks_b[vid] for vid in shared_ids]

    return list_a, list_b


def kendall_similarity(a: TasteProfile, b: TasteProfile) -> float:
    """
    Returns Kendall Tau correlation ∈ [-1, 1] where 1 = identical order.
    Returns 0.0 if no overlap (no shared venues).
    """
    list_a, list_b = extract_shared_venues(a, b)

    if len(list_a) < 2:
        return 0.0

    tau, _ = kendalltau(list_a, list_b)
    if tau is None or tau != tau:  # NaN guard
        return 0.0

    return float(tau)
