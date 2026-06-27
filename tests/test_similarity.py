"""taste.node — Phase 2 similarity engine tests."""

from datetime import datetime, timezone, timedelta
import pytest

from src.models import Venue, RankedItem, TasteContext, TasteProfile
from src.similarity import compute_similarity, time_decay_weight


UTC = timezone.utc


def _make_profile(user_id: str, venue_ids: list[str], name_prefix: str = "V") -> TasteProfile:
    """Build a TasteProfile with one context ('default') containing venues in order."""
    ranked_list = [
        RankedItem(
            venue=Venue(id=vid, name=f"{name_prefix}{vid}"),
            visited_at=datetime(2025, 6, 15, 19, 30, tzinfo=UTC),
        )
        for vid in venue_ids
    ]
    return TasteProfile(
        user_id=user_id,
        contexts={
            "default": TasteContext(
                context_id="default",
                ranked_list=ranked_list,
            )
        },
        default_context="default",
    )


class TestComputeSimilarity:
    def test_perfect_correlation(self):
        """Identical ordering → distance 0.0."""
        a = _make_profile("alice", ["v1", "v2", "v3", "v4"])
        b = _make_profile("bob", ["v1", "v2", "v3", "v4"])
        assert compute_similarity(a, b, "default") == pytest.approx(0.0, abs=1e-9)

    def test_inverse_correlation(self):
        """Reverse ordering → distance 1.0."""
        a = _make_profile("alice", ["v1", "v2", "v3", "v4"])
        b = _make_profile("bob", ["v4", "v3", "v2", "v1"])
        assert compute_similarity(a, b, "default") == pytest.approx(1.0, abs=1e-9)

    def test_no_shared_venues(self):
        """No overlap → sentinel -1.0."""
        a = _make_profile("alice", ["v1", "v2", "v3"])
        b = _make_profile("bob", ["v4", "v5", "v6"])
        assert compute_similarity(a, b, "default") == -1.0

    def test_single_shared_venue(self):
        """Only one shared venue → insufficient data."""
        a = _make_profile("alice", ["v1", "v2", "v3"])
        b = _make_profile("bob", ["v1", "v4", "v5"])
        assert compute_similarity(a, b, "default") == -1.0

    def test_partial_overlap(self):
        """Some overlap but not identical → distance in (0, 1)."""
        a = _make_profile("alice", ["v1", "v2", "v3", "v4"])
        b = _make_profile("bob", ["v1", "v3", "v2", "v4"])
        d = compute_similarity(a, b, "default")
        assert 0.0 < d < 1.0

    def test_missing_context(self):
        """One profile lacks the context → -1.0."""
        a = _make_profile("alice", ["v1", "v2"])
        b = TasteProfile(
            user_id="bob",
            contexts={
                "other": TasteContext(context_id="other", ranked_list=[]),
            },
            default_context="other",
        )
        assert compute_similarity(a, b, "default") == -1.0


class TestTimeDecayWeight:
    def test_classic_is_one(self):
        now = datetime.now(UTC)
        past = now - timedelta(days=1000)
        assert time_decay_weight(past, now, is_classic=True) == 1.0

    def test_730_days_approximately_half(self):
        now = datetime.now(UTC)
        past = now - timedelta(days=730)
        w = time_decay_weight(past, now, halflife_days=365.0)
        assert w == pytest.approx(0.25, abs=0.01)  # 2^(-730/365) = 2^-2 = 0.25

    def test_365_days_approximately_half(self):
        now = datetime.now(UTC)
        past = now - timedelta(days=365)
        w = time_decay_weight(past, now, halflife_days=365.0)
        assert w == pytest.approx(0.5, abs=0.01)

    def test_fresh_visit_is_near_one(self):
        now = datetime.now(UTC)
        past = now - timedelta(days=1)
        w = time_decay_weight(past, now, halflife_days=365.0)
        assert w > 0.99

    def test_future_date_clamped_to_zero(self):
        now = datetime.now(UTC)
        future = now + timedelta(days=10)
        w = time_decay_weight(future, now)
        assert w == 1.0  # age_days max(0, ...) = 0
