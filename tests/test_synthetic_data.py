import random
from src.synthetic_data import generate_synthetic_profiles, generate_venue_pool, generate_ranked_list_for_persona


def test_venue_pool_deterministic():
    pool1 = generate_venue_pool(n=20, rng=random.Random(123))
    pool2 = generate_venue_pool(n=20, rng=random.Random(123))
    assert [v.id for v in pool1] == [v.id for v in pool2]
    assert [v.name for v in pool1] == [v.name for v in pool2]


def test_profiles_have_contexts():
    profiles = generate_synthetic_profiles(n_users=10, seed=42)
    assert len(profiles) == 10
    for p in profiles:
        assert p.user_id.startswith("u")
        assert "default" in p.contexts
        assert len(p.contexts["default"].ranked_list) >= 5


def test_profiles_have_temporal_items():
    profiles = generate_synthetic_profiles(n_users=5, seed=7)
    for p in profiles:
        for ctx in p.contexts.values():
            for item in ctx.ranked_list:
                assert item.visited_at is not None
                assert item.occasion_tag in {"solo", "date", "business", "group", "comfort"}


def test_persona_bias():
    venues = generate_venue_pool(n=50, rng=random.Random(8))
    ramen_items = generate_ranked_list_for_persona(venues, "ramen_lover", n_items=5, rng=random.Random(9))
    names = [i.venue.name for i in ramen_items]
    # At least one ramen-related venue should appear in top picks
    assert any("Ramen" in n or "Noodle" in n or "Sushi" in n for n in names)
