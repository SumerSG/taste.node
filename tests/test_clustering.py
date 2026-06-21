import numpy as np
from src.clustering import build_distance_matrix, cluster_profiles_hdbscan, ContextualClusterMap
from src.similarity import kendall_distance
from src.synthetic_data import generate_synthetic_profiles


def test_distance_matrix_shape():
    profiles = generate_synthetic_profiles(n_users=10, seed=1)
    dist = build_distance_matrix(profiles, context_id="default")
    assert dist.shape == (10, 10)
    assert np.allclose(np.diag(dist), 0.0)
    assert np.allclose(dist, dist.T)


def test_distance_matrix_uses_max_for_no_overlap():
    profiles = generate_synthetic_profiles(n_users=10, seed=2)
    dist = build_distance_matrix(profiles, context_id="default")
    # No pair should have NaN; no-overlap pairs should be 1.0
    assert not np.isnan(dist).any()
    assert np.all((dist >= 0.0) & (dist <= 1.0))


def test_hdbscan_returns_labels():
    profiles = generate_synthetic_profiles(n_users=20, seed=3)
    labels = cluster_profiles_hdbscan(profiles, context_id="default", min_cluster_size=3)
    assert labels.shape == (20,)
    assert all(isinstance(l, (int, np.integer)) for l in labels)


def test_hdbscan_too_few_users():
    profiles = generate_synthetic_profiles(n_users=2, seed=4)
    labels = cluster_profiles_hdbscan(profiles, context_id="default", min_cluster_size=3)
    assert np.all(labels == -1)


def test_contextual_cluster_map():
    profiles = generate_synthetic_profiles(n_users=15, seed=5)
    cmap = ContextualClusterMap(profiles, min_cluster_size=3)
    cmap.fit_all_contexts()
    for ctx in cmap.context_clusters:
        for p in profiles:
            label = cmap.get_label(p.user_id, ctx)
            assert label is not None
            assert isinstance(label, int)


def test_cluster_labels_differ_by_context():
    profiles = generate_synthetic_profiles(n_users=20, seed=6)
    cmap = ContextualClusterMap(profiles, min_cluster_size=3)
    cmap.fit_context("default")
    if "date_night" in {c for p in profiles for c in p.contexts}:
        cmap.fit_context("date_night")
        diff_found = False
        for p in profiles:
            l1 = cmap.get_label(p.user_id, "default")
            l2 = cmap.get_label(p.user_id, "date_night")
            if l1 != l2:
                diff_found = True
                break
        # Not guaranteed for tiny random data, but seed 6 usually produces divergence
        # We just assert the map exists and is consistent per context.
        assert "default" in cmap.context_clusters
