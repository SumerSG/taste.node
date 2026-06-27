"""taste.node — Phase 1 model validation tests."""

import json
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from src.models import (
    Venue,
    RankedItem,
    TasteContext,
    TasteProfile,
    ClusterResult,
    RankedItemInput,
    Recommendation,
    ErrorResponse,
)


class TestVenue:
    def test_minimal_venue(self):
        v = Venue(id="v1", name="Test Bistro")
        assert v.source == "synthetic"
        assert v.cuisines == []
        assert v.price_tier is None

    def test_full_venue_roundtrip(self):
        v = Venue(
            id="v1",
            name="Test Bistro",
            location={"lat": 40.7128, "lng": -74.006},
            cuisines=["Italian", "Pasta"],
            dietary_tags=["vegetarian"],
            price_tier=2,
            health_score=0.8,
            source="api",
        )
        data = v.model_dump(mode="json")
        restored = Venue.model_validate(data)
        assert restored.id == v.id
        assert restored.cuisines == v.cuisines
        assert restored.source == "api"

    def test_source_enum_rejection(self):
        with pytest.raises(ValidationError):
            Venue(id="v1", name="X", source="scraped")  # not in Literal


class TestRankedItem:
    def test_computed_field_present(self):
        item = RankedItem(
            venue=Venue(id="v1", name="X"),
            visited_at=datetime(2025, 6, 15, 19, 30, tzinfo=timezone.utc),
        )
        assert hasattr(item, "rank")
        assert item.rank == 0.0
        data = item.model_dump(mode="json")
        assert "rank" in data
        assert data["rank"] == 0.0

    def test_occasion_tag_enum_rejection(self):
        with pytest.raises(ValidationError):
            RankedItem(
                venue=Venue(id="v1", name="X"),
                visited_at=datetime.now(timezone.utc),
                occasion_tag="invalid_tag",
            )

    def test_defaults(self):
        now = datetime.now(timezone.utc)
        item = RankedItem(
            venue=Venue(id="v1", name="X"),
            visited_at=now,
        )
        assert item.occasion_tag == "solo"
        assert item.is_classic is False
        assert (item.added_at - now).total_seconds() < 1

    def test_mvp_fields(self):
        item = RankedItem(
            venue=Venue(id="v1", name="X"),
            visited_at=datetime.now(timezone.utc),
            status="favourite",
            personal_rating=5,
            reaction="Incredible.",
            meal_type="dinner",
            dishes=["Omakase", "Sake"],
        )
        data = item.model_dump(mode="json")
        assert data["status"] == "favourite"
        assert data["personal_rating"] == 5
        assert data["reaction"] == "Incredible."
        assert data["meal_type"] == "dinner"
        assert data["dishes"] == ["Omakase", "Sake"]


class TestTasteProfile:
    def test_default_context_must_exist(self):
        with pytest.raises(ValidationError):
            TasteProfile(
                user_id="alice_42",
                contexts={},
                default_context="default",
            )

    def test_valid_profile_roundtrip(self):
        profile = TasteProfile(
            user_id="alice_42",
            contexts={
                "default": TasteContext(
                    context_id="default",
                    ranked_list=[
                        RankedItem(
                            venue=Venue(id="v1", name="Golden Bistro"),
                            visited_at=datetime(2025, 6, 15, 19, 30, tzinfo=timezone.utc),
                        )
                    ],
                )
            },
            default_context="default",
        )
        data = json.loads(profile.model_dump_json())
        restored = TasteProfile.model_validate(data)
        assert restored.user_id == "alice_42"
        assert "default" in restored.contexts

    def test_custom_context(self):
        profile = TasteProfile(
            user_id="bob",
            contexts={
                "default": TasteContext(
                    context_id="default",
                    ranked_list=[],
                ),
                "date_night": TasteContext(
                    context_id="date_night",
                    ranked_list=[],
                ),
            },
            default_context="date_night",
        )
        assert profile.default_context == "date_night"


class TestClusterResult:
    def test_serialization(self):
        cr = ClusterResult(
            context_id="default",
            labels={"alice_42": 0, "bob_99": 0, "charlie_01": -1},
            noise_ids=["charlie_01"],
            n_clusters=1,
        )
        data = cr.model_dump(mode="json")
        assert data["n_clusters"] == 1
        assert data["noise_ids"] == ["charlie_01"]


class TestRankedItemInput:
    def test_defaults(self):
        inp = RankedItemInput(venue_id="v1")
        assert inp.venue_name is None
        assert inp.occasion_tag == "solo"
        assert inp.is_classic is False


class TestRecommendation:
    def test_score_bounds(self):
        rec = Recommendation(
            venue=Venue(id="v1", name="X"),
            score=0.87,
            explanation="Great match.",
            context_id="default",
        )
        assert rec.score == 0.87


class TestErrorResponse:
    def test_shape(self):
        err = ErrorResponse(
            error="user_not_found",
            message="User not found",
            detail={"user_id": "alice_42"},
        )
        data = err.model_dump(mode="json")
        assert data["error"] == "user_not_found"
