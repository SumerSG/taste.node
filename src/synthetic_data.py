"""
Synthetic Taste Profile Generator
=================================
Fully deterministic, seeded PRNG dataset for internal development and demo.
No production scrapers. No reliance on scraped seed data.

Phase 1 (Development & Internal Demo): Use this synthetic dataset to validate
clustering and recommendation logic without legal risk.

Phase 2 (Production): Integrate real data only through documented public APIs
(e.g., Yelp Fusion, Google Places) with proper attribution and rate-limiting.
"""

from datetime import datetime, timedelta, timezone
from typing import List
import random

from .models import Venue, RankedItem, TasteContext, TasteProfile


def generate_venue_pool(n: int = 50, rng: random.Random = None) -> List[Venue]:
    """Generate a pool of synthetic venues."""
    rng = rng or random.Random(42)
    adjectives = [
        "Golden", "Spicy", "Hidden", "Urban", "Rustic", "Neon", "Royal",
        "Tiny", "Midnight", "Morning", "Blue", "Red", "Silver", "Wild",
    ]
    nouns = [
        "Bistro", "Grill", "Noodle", "Taco", "Sushi", "Curry", "Pizza",
        "Burger", "Ramen", "Pasta", "BBQ", "Seafood", "Cafe", "Bar",
    ]
    venues = []
    for i in range(n):
        name = f"{rng.choice(adjectives)} {rng.choice(nouns)} {i}"
        venues.append(Venue(id=f"v{i:03d}", name=name))
    return venues


def generate_ranked_list_for_persona(
    venues: List[Venue],
    persona: str,
    n_items: int = 8,
    rng: random.Random = None,
    base_time: datetime = None,
) -> List[RankedItem]:
    """
    Generate a ranked list biased by a taste persona.
    Personas define cuisine affinities via venue-name keyword matching.
    """
    rng = rng or random.Random(42)
    base_time = base_time or datetime.now(timezone.utc)

    # Define affinity keywords per persona
    affinities = {
        "ramen_lover": ["Ramen", "Noodle", "Sushi"],
        "burger_queen": ["Burger", "Grill", "BBQ"],
        "pizza_aficionado": ["Pizza", "Pasta", "Cafe"],
        "sushi_samurai": ["Sushi", "Ramen", "Seafood"],
        "taco_titan": ["Taco", "Grill", "Bar"],
        "curry_connoisseur": ["Curry", "Noodle", "Bistro"],
        "michelin_chaser": ["Bistro", "Seafood", "Sushi"],
        "casual_explorer": [],
    }

    keywords = affinities.get(persona, [])

    # Score venues by affinity
    def score(v: Venue) -> float:
        if not keywords:
            return rng.random()
        return sum(1 for kw in keywords if kw in v.name) * 2.0 + rng.random()

    scored = sorted(venues, key=score, reverse=True)
    selected = scored[:n_items]

    items = []
    for rank, venue in enumerate(selected, start=1):
        # Stagger visit dates backward from base_time
        days_back = rng.randint(0, 730)
        visited_at = base_time - timedelta(days=days_back)
        occasion_options = ["solo", "date", "business", "group", "comfort"]
        occasion_tag = rng.choice(occasion_options)
        items.append(
            RankedItem(
                venue=venue,
                visited_at=visited_at,
                added_at=visited_at,
                occasion_tag=occasion_tag,
            )
        )
    # Sort by rank (descending affinity order)
    return items


def generate_synthetic_profiles(
    n_users: int = 30,
    seed: int = 42,
    base_time: datetime = None,
) -> List[TasteProfile]:
    """
    Generate a fully synthetic taste profile dataset for internal demo.
    Each user receives multiple contexts so clustering can be evaluated contextually.
    """
    rng = random.Random(seed)
    venues = generate_venue_pool(n=50, rng=rng)
    base_time = base_time or datetime.now(timezone.utc)

    personas = [
        "ramen_lover", "burger_queen", "pizza_aficionado", "sushi_samurai",
        "taco_titan", "curry_connoisseur", "michelin_chaser", "casual_explorer",
    ]
    contexts = ["default", "date_night", "solo_comfort", "business_lunch"]

    profiles: List[TasteProfile] = []
    for i in range(n_users):
        persona = rng.choice(personas)
        contexts_dict = {}
        for ctx_id in contexts:
            # Default context is mandatory; others are probabilistic
            if ctx_id == "default" or rng.random() < 0.8:
                items = generate_ranked_list_for_persona(
                    venues, persona, n_items=rng.randint(5, 12), rng=rng, base_time=base_time,
                )
                # Slightly perturb rank orders per context
                if ctx_id != "default" and rng.random() < 0.4:
                    rng.shuffle(items)
                contexts_dict[ctx_id] = TasteContext(
                    context_id=ctx_id,
                    ranked_list=items,
                )
        profile = TasteProfile(
            user_id=f"u{i:03d}",
            contexts=contexts_dict,
            default_context="default",
        )
        profiles.append(profile)

    return profiles
