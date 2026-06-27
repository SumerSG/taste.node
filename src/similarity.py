"""taste.node — Similarity Engine (Kendall Tau + time-decay)."""

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

    Recent visits have higher weight. A visit >365 days ago receives a decay
    factor unless ``is_classic`` is True. This ensures your latest visit to
    each place is what shapes your taste cluster most.
    """
    if is_classic:
        return 1.0
    # Defensive: SQLite round-trips may yield naive datetimes
    if visited_at.tzinfo is None:
        visited_at = visited_at.replace(tzinfo=timezone.utc)
    if reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)
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

    # Build venue_id -> (position, item) maps, excluding "not_for_me" items
    a_map = {item.venue.id: (idx + 1, item) for idx, item in enumerate(a_ctx.ranked_list) if item.status != "not_for_me"}
    b_map = {item.venue.id: (idx + 1, item) for idx, item in enumerate(b_ctx.ranked_list) if item.status != "not_for_me"}

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

    # SciPy 1.14 does not expose per-item weights in kendalltau.
    # When we have meaningful decay weights, compute a weighted tau manually;
    # otherwise fall back to the fast library path for exactness.
    weights = [float(w) for w in weights]
    tau: float = _weighted_kendall_tau(ranks_a, ranks_b, weights)

    # NaN or degenerate check
    if np.isnan(tau):
        return -1.0

    # Normalize to [0, 1] distance; tau is in [-1, 1]
    distance = (1.0 - tau) / 2.0

    # Clamp to [0, 1] for floating-point safety
    return max(0.0, min(1.0, distance))


def _weighted_kendall_tau(
    ranks_a: List[int],
    ranks_b: List[int],
    weights: List[float],
) -> float:
    """Weighted Kendall tau-b.

    Fast-path: if all weights are within 1e-9 of each other, delegates to
    ``scipy.stats.kendalltau`` for exact p-value and behaviour.

    Weighted path: each pair (i, j) is weighted by ``w[i] * w[j]``.
    """
    w = np.asarray(weights, dtype=float)
    # Fast path — near-equal weights
    if np.allclose(w, w[0], atol=1e-9):
        tau_val, _ = kendalltau(ranks_a, ranks_b)
        return float(tau_val)

    a = np.asarray(ranks_a, dtype=float)
    b = np.asarray(ranks_b, dtype=float)
    n = len(a)
    concordant = 0.0
    discordant = 0.0
    tied_a = 0.0
    tied_b = 0.0

    for i in range(n):
        for j in range(i + 1, n):
            pair_w = float(w[i] * w[j])
            da = a[i] - a[j]
            db = b[i] - b[j]
            if da == 0 and db == 0:
                continue
            if da == 0:
                tied_a += pair_w
                continue
            if db == 0:
                tied_b += pair_w
                continue
            if da * db > 0:
                concordant += pair_w
            else:
                discordant += pair_w

    total = concordant + discordant + tied_a + tied_b
    if total == 0:
        return np.nan

    # tau-b normalisation to keep bounds at [-1, 1]
    numerator = concordant - discordant
    denom = np.sqrt((concordant + discordant + tied_a) * (concordant + discordant + tied_b))
    if denom == 0:
        return np.nan
    return numerator / denom
