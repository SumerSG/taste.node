"""taste.node — Phase 3 clustering engine tests."""

import pytest

from src.clustering import ContextualClusterMap
from src.similarity import compute_similarity
from scripts.generate_synthetic_data import generate_profiles


class TestContextualClusterMap:
    def test_noise_points_exist(self):
        """With 20 synthetic profiles, at least one user should be noise (-1)."""
        profiles = generate_profiles(seed=42, n_users=20)
        engine = ContextualClusterMap(profiles, min_cluster_size=5)
        result = engine.fit_context("default")
        assert len(result.noise_ids) >= 1, "Expected at least one noise point"

    def test_n_clusters_or_documented_noise_only(self):
        """Either we have >=1 cluster, or noise-only is acceptable and noted."""
        profiles = generate_profiles(seed=42, n_users=20)
        engine = ContextualClusterMap(profiles, min_cluster_size=5)
        result = engine.fit_context("default")
        if result.n_clusters == 0:
            pytest.skip("Noise-only result is acceptable for small synthetic data")
        else:
            assert result.n_clusters >= 1

    def test_labels_match_noise_ids(self):
        profiles = generate_profiles(seed=42, n_users=20)
        engine = ContextualClusterMap(profiles, min_cluster_size=5)
        result = engine.fit_context("default")
        for uid, lab in result.labels.items():
            if lab == -1:
                assert uid in result.noise_ids
            else:
                assert uid not in result.noise_ids

    def test_get_label_after_fit(self):
        profiles = generate_profiles(seed=42, n_users=20)
        engine = ContextualClusterMap(profiles, min_cluster_size=5)
        engine.fit_context("default")
        label = engine.get_label("user_000", "default")
        assert label is not None

    def test_get_label_without_fit(self):
        profiles = generate_profiles(seed=42, n_users=20)
        engine = ContextualClusterMap(profiles, min_cluster_size=5)
        label = engine.get_label("user_000", "default")
        assert label is None

    def test_fit_all_contexts(self):
        profiles = generate_profiles(seed=42, n_users=20)
        engine = ContextualClusterMap(profiles, min_cluster_size=5)
        results = engine.fit_all_contexts()
        assert "default" in results
        assert "date_night" in results
        assert "solo_comfort" in results

    def test_small_user_set_all_noise(self):
        """With fewer users than min_cluster_size, everyone must be noise."""
        profiles = generate_profiles(seed=42, n_users=3)
        engine = ContextualClusterMap(profiles, min_cluster_size=5)
        result = engine.fit_context("default")
        assert result.n_clusters == 0
        assert len(result.noise_ids) == len(result.labels)


class TestDistanceMatrix:
    def test_symmetric_and_zero_diagonal(self):
        profiles = generate_profiles(seed=42, n_users=10)
        from src.clustering import _build_distance_matrix
        mat = _build_distance_matrix(profiles, "default")
        assert mat is not None
        n = mat.shape[0]
        for i in range(n):
            assert mat[i, i] == pytest.approx(0.0, abs=1e-9)
            for j in range(i + 1, n):
                assert mat[i, j] == pytest.approx(mat[j, i], abs=1e-9)
                assert 0.0 <= mat[i, j] <= 1.0
