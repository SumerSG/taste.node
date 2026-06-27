"""taste.node — Phase 3: Clustering Engine (HDBSCAN wrapper)."""

from typing import Dict, List, Optional

import numpy as np
import hdbscan

from src.models import TasteProfile, ClusterResult
from src.similarity import compute_similarity


def _build_distance_matrix(
    profiles: List[TasteProfile], context_id: str
) -> Optional[np.ndarray]:
    """Build an N×N precomputed distance matrix for *context_id*.

    Returns ``None`` if fewer than 2 profiles have data in the context.
    Sentinel ``-1.0`` (no overlap) is replaced with ``1.0``.
    """
    valid = [p for p in profiles if context_id in p.contexts and p.contexts[context_id].ranked_list]
    n = len(valid)
    if n < 2:
        return None

    matrix = np.full((n, n), 1.0, dtype=float)
    for i in range(n):
        matrix[i, i] = 0.0
        for j in range(i + 1, n):
            d = compute_similarity(valid[i], valid[j], context_id)
            # Replace insufficient-data sentinel with max distance
            if d < 0:
                d = 1.0
            matrix[i, j] = d
            matrix[j, i] = d
    return matrix


class ContextualClusterMap:
    """Manages per-context HDBSCAN clustering on precomputed Kendall-Tau distances."""

    def __init__(self, profiles: List[TasteProfile], min_cluster_size: int = 5):
        self._profiles = profiles
        self._min_cluster_size = min_cluster_size
        self._results: Dict[str, ClusterResult] = {}

    def fit_context(self, context_id: str) -> ClusterResult:
        """Run HDBSCAN on *context_id* and cache the result."""
        valid = [p for p in self._profiles if context_id in p.contexts and p.contexts[context_id].ranked_list]
        n = len(valid)

        if n < self._min_cluster_size:
            # Not enough users — everyone is noise
            result = ClusterResult(
                context_id=context_id,
                labels={p.user_id: -1 for p in valid},
                noise_ids=[p.user_id for p in valid],
                n_clusters=0,
            )
            self._results[context_id] = result
            return result

        matrix = _build_distance_matrix(self._profiles, context_id)
        if matrix is None:
            result = ClusterResult(
                context_id=context_id,
                labels={p.user_id: -1 for p in valid},
                noise_ids=[p.user_id for p in valid],
                n_clusters=0,
            )
            self._results[context_id] = result
            return result

        clusterer = hdbscan.HDBSCAN(
            metric="precomputed",
            min_cluster_size=self._min_cluster_size,
            allow_single_cluster=False,
        )
        labels = clusterer.fit_predict(matrix)

        label_map: Dict[str, int] = {}
        noise_ids: List[str] = []
        for idx, profile in enumerate(valid):
            lab = int(labels[idx])
            label_map[profile.user_id] = lab
            if lab == -1:
                noise_ids.append(profile.user_id)

        n_clusters = len({lab for lab in labels if lab != -1})

        result = ClusterResult(
            context_id=context_id,
            labels=label_map,
            noise_ids=noise_ids,
            n_clusters=n_clusters,
        )
        self._results[context_id] = result
        return result

    def fit_all_contexts(self) -> Dict[str, ClusterResult]:
        """Discover all contexts present in the profile set and fit each."""
        context_ids = set()
        for p in self._profiles:
            context_ids.update(p.contexts.keys())
        for cid in context_ids:
            self.fit_context(cid)
        return dict(self._results)

    def get_label(self, user_id: str, context_id: str) -> Optional[int]:
        """Return the cached cluster label for a user in a context, or None."""
        result = self._results.get(context_id)
        if result is None:
            return None
        return result.labels.get(user_id)
