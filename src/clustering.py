from typing import Dict, List, Optional
import numpy as np
import hdbscan

from .models import TasteProfile
from .similarity import kendall_distance


def build_distance_matrix(
    profiles: List[TasteProfile],
    context_id: Optional[str] = None,
) -> np.ndarray:
    """
    Build an N x N symmetric distance matrix using normalized Kendall Tau distance.
    Pairs with no overlap (None) are treated as maximum distance (1.0) —
    i.e., completely uninformative, not strongly disagreeing.
    """
    n = len(profiles)
    dist_matrix = np.zeros((n, n), dtype=float)
    for i in range(n):
        for j in range(i, n):
            if i == j:
                dist_matrix[i, j] = 0.0
                continue
            dist = kendall_distance(profiles[i], profiles[j], context_id=context_id)
            if dist is None:
                dist = 1.0  # max distance for no overlap (noise separation)
            dist_matrix[i, j] = dist_matrix[j, i] = dist
    return dist_matrix


def cluster_profiles_hdbscan(
    profiles: List[TasteProfile],
    context_id: Optional[str] = None,
    min_cluster_size: int = 3,
    min_samples: int = 1,
) -> np.ndarray:
    """
    Apply HDBSCAN on the precomputed Kendall distance matrix.

    Why HDBSCAN?
    - Handles non-convex, non-spherical clusters (taste is not Gaussian blobs).
    - Allows noise points without forcing every user into a cluster.
    - No preset K required — discovers density-adaptive cluster count.

    Returns an array of cluster labels.  Label -1 denotes noise (outlier).
    """
    if len(profiles) < min_cluster_size:
        # Too few profiles for meaningful clustering
        return np.full(len(profiles), -1, dtype=int)

    dist_matrix = build_distance_matrix(profiles, context_id=context_id)
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        metric="precomputed",
        allow_single_cluster=True,
    )
    clusterer.fit(dist_matrix)
    return clusterer.labels_


class ContextualClusterMap:
    """
    Maintains a cluster map per taste context.
    A user may be "Adventurous" for date_night but "Consistent" for business_lunch.
    """

    def __init__(self, profiles: List[TasteProfile], min_cluster_size: int = 3):
        self.profiles = {p.user_id: p for p in profiles}
        self.min_cluster_size = min_cluster_size
        self.context_clusters: Dict[str, Dict[str, int]] = {}

    def fit_context(self, context_id: str) -> Dict[str, int]:
        """
        Run HDBSCAN clustering for a specific context and store labels.
        Returns mapping user_id -> cluster label (-1 for noise).
        """
        labels = cluster_profiles_hdbscan(
            list(self.profiles.values()),
            context_id=context_id,
            min_cluster_size=self.min_cluster_size,
        )
        mapping = {
            p.user_id: int(labels[idx])
            for idx, p in enumerate(self.profiles.values())
        }
        self.context_clusters[context_id] = mapping
        return mapping

    def fit_all_contexts(self) -> None:
        """Discover all unique context IDs across profiles and cluster each."""
        all_contexts = set()
        for p in self.profiles.values():
            all_contexts.update(p.contexts.keys())
        for ctx in all_contexts:
            self.fit_context(ctx)

    def get_label(self, user_id: str, context_id: str) -> Optional[int]:
        if context_id not in self.context_clusters:
            return None
        return self.context_clusters[context_id].get(user_id)
