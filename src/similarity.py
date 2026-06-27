"""taste.node — Phase 2: Similarity Engine (Kendall Tau + time-decay)."""

from datetime import datetime, timezone
from typing import List, Tuple

import numpy as np
from scipy.stats import kendalltau

from src.models import TasteProfile


def time_decay_weight(
    visited_at: datetime,
    reference_time: datetime,
    halflife_days: float = 365.0,
    is_classic: bool = False,
) -> float:
    """Exponential time-decay weight.

    A visit >365 days ago receives a decay factor unless ``is_classic`` is True.
    """
    if is_classic:
        return 1.0
    age_days = max(0.0, (reference_time - visited_at).total_seconds() / 86400.0)
    return 2.0 ** (-age_days / halflife_days)


def _extract_shared_ranks(
    a: TasteProfile, b: TasteProfile, context_id: str
) -> Tuple[List[int], List[int], List[float]] | None:
    """Return (ranks_a, ranks_b, weights) for venues shared in *context_id*.

    Returns ``None`` when either profile lacks the context or no venues overlap.
    """
    a_ctx = a.contexts.get(context_id)
    b_ctx = b.contexts.get(context_id)
    if not a_ctx or not b_ctx:
        return None

    # Build venue_id -> (position, item) maps (1-indexed rank = position)
    a_map = {item.venue.id: (idx + 1, item) for idx, item in enumerate(a_ctx.ranked_list)}
    b_map = {item.venue.id: (idx + 1, item) for idx, item in enumerate(b_ctx.ranked_list)}

    shared_ids = set(a_map.keys()) & set(b_map.keys())
    if not shared_ids:
        return None

    ranks_a: List[int] = []
    ranks_b: List[int] = []
    weights: List[float] = []

    ref = datetime.now(timezone.utc)
    for vid in shared_ids:
        pos_a, item_a = a_map[vid]
        pos_b, item_b = b_map[vid]
        ranks_a.append(pos_a)
        ranks_b.append(pos_b)

        w_a = time_decay_weight(item_a.visited_at, ref, is_classic=item_a.is_classic)
        w_b = time_decay_weight(item_b.visited_at, ref, is_classic=item_b.is_classic)
        weights.append((w_a + w_b) / 2.0)

    return ranks_a, ranks_b, weights


def compute_similarity(
    a: TasteProfile,
    b: TasteProfile,
    context_id: str,
) -> float:
    """Normalized Kendall-Tau distance between *a* and *b* in *context_id*.

    Returns a float in ``[0.0, 1.0]`` or the sentinel ``-1.0`` when insufficient
    data (no shared venues).
    """
    extracted = _extract_shared_ranks(a, b, context_id)
    if extracted is None:
        return -1.0

    ranks_a, ranks_b, weights = extracted

    # SciPy requires at least 2 elements for Kendall tau; with 1 shared venue
    # correlation is undefined (NaN). Treat as insufficient data.
    if len(ranks_a) < 2:
        return -1.0

    tau, _pvalue = kendalltau(ranks_a, ranks_b)

    # NaN check — can happen with perfect ties or degenerate data
    if np.isnan(tau):
        return -1.0

    # Normalize to [0, 1] distance; tau is in [-1, 1]
    distance = (1.0 - float(tau)) / 2.0

    # Clamp to [0, 1] for floating-point safety
    return max(0.0, min(1.0, distance))
