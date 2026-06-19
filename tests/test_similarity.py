from datetime import datetime
from src.models import TasteProfile, Venue, RankedItem
from src.similarity import kendall_similarity, extract_shared_venues


def test_perfect_correlation():
    venues = [Venue(id=f"v{i}", name=f"Venue {i}") for i in range(3)]

    a = TasteProfile(
        user_id="u1",
        ranked_list=[
            RankedItem(venue=venues[0], rank=1),
            RankedItem(venue=venues[1], rank=2),
            RankedItem(venue=venues[2], rank=3),
        ],
    )
    b = TasteProfile(
        user_id="u2",
        ranked_list=[
            RankedItem(venue=venues[0], rank=1),
            RankedItem(venue=venues[1], rank=2),
            RankedItem(venue=venues[2], rank=3),
        ],
    )

    assert kendall_similarity(a, b) == 1.0


def test_inverse_correlation():
    venues = [Venue(id=f"v{i}", name=f"Venue {i}") for i in range(3)]

    a = TasteProfile(
        user_id="u1",
        ranked_list=[
            RankedItem(venue=venues[0], rank=1),
            RankedItem(venue=venues[1], rank=2),
            RankedItem(venue=venues[2], rank=3),
        ],
    )
    b = TasteProfile(
        user_id="u2",
        ranked_list=[
            RankedItem(venue=venues[0], rank=3),
            RankedItem(venue=venues[1], rank=2),
            RankedItem(venue=venues[2], rank=1),
        ],
    )

    assert kendall_similarity(a, b) == -1.0


def test_no_overlap():
    a = TasteProfile(
        user_id="u1",
        ranked_list=[RankedItem(venue=Venue(id="v1", name="A"), rank=1)],
    )
    b = TasteProfile(
        user_id="u2",
        ranked_list=[RankedItem(venue=Venue(id="v2", name="B"), rank=1)],
    )

    assert kendall_similarity(a, b) == 0.0
