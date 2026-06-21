from datetime import datetime, timedelta, timezone
from src.models import TasteProfile, Venue, RankedItem, TasteContext
from src.similarity import kendall_similarity, kendall_distance, extract_shared_venues


def _make_item(venue_id: str, days_back: int = 0, occasion: str = "solo"):
    venue = Venue(id=venue_id, name=f"Venue {venue_id}")
    visited = datetime.now(timezone.utc) - timedelta(days=days_back)
    return RankedItem(venue=venue, visited_at=visited, occasion_tag=occasion)


def test_perfect_correlation():
    items = [_make_item(f"v{i}") for i in range(3)]
    a = TasteProfile(
        user_id="u1",
        contexts={"default": TasteContext(context_id="default", ranked_list=items)},
    )
    b = TasteProfile(
        user_id="u2",
        contexts={"default": TasteContext(context_id="default", ranked_list=list(items))},
    )
    assert kendall_similarity(a, b) == 1.0
    assert kendall_distance(a, b) == 0.0


def test_inverse_correlation():
    # Rank is encoded by list order (position 0 = rank 1, position 2 = rank 3)
    items_a = [_make_item("v0"), _make_item("v1"), _make_item("v2")]
    items_b = [_make_item("v2"), _make_item("v1"), _make_item("v0")]
    a = TasteProfile(
        user_id="u1",
        contexts={"default": TasteContext(context_id="default", ranked_list=items_a)},
    )
    b = TasteProfile(
        user_id="u2",
        contexts={"default": TasteContext(context_id="default", ranked_list=items_b)},
    )
    assert kendall_similarity(a, b) == 0.0
    assert kendall_distance(a, b) == 1.0


def test_no_overlap_returns_none():
    a = TasteProfile(
        user_id="u1",
        contexts={"default": TasteContext(context_id="default", ranked_list=[_make_item("v1")])},
    )
    b = TasteProfile(
        user_id="u2",
        contexts={"default": TasteContext(context_id="default", ranked_list=[_make_item("v2")])},
    )
    assert kendall_similarity(a, b) is None
    assert kendall_distance(a, b) is None


def test_contextual_comparison():
    default_items = [_make_item("v0"), _make_item("v1")]
    date_items = [_make_item("v2"), _make_item("v3")]
    a = TasteProfile(
        user_id="u1",
        contexts={
            "default": TasteContext(context_id="default", ranked_list=default_items),
            "date_night": TasteContext(context_id="date_night", ranked_list=default_items),
        },
    )
    b = TasteProfile(
        user_id="u2",
        contexts={
            "default": TasteContext(context_id="default", ranked_list=list(default_items)),
            "date_night": TasteContext(context_id="date_night", ranked_list=list(date_items)),
        },
    )
    assert kendall_similarity(a, b, context_id="default") == 1.0
    assert kendall_similarity(a, b, context_id="date_night") is None


def test_extract_shared_venues_weights():
    items_a = [
        _make_item("v0", days_back=10),
        _make_item("v1", days_back=20),
    ]
    items_b = [
        _make_item("v1", days_back=15),
        _make_item("v0", days_back=25),
    ]
    list_a, list_b, weights = extract_shared_venues(items_a, items_b)
    # v0 is at position 1 (rank 1) in A, position 2 (rank 2) in B
    # v1 is at position 2 (rank 2) in A, position 1 (rank 1) in B
    assert list_a == [1, 2]
    assert list_b == [2, 1]
    assert len(weights) == 2
    assert all(0.0 < w <= 1.0 for w in weights)
