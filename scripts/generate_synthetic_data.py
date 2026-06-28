"""taste.node — Phase 4: Synthetic Data Generator.

Usage:
    python scripts/generate_synthetic_data.py > data/synthetic_profiles.jsonl

Generates 1000 users, 3 contexts each, with 5-12 RankedItem instances per context.
Uses a seeded PRNG for deterministic output.
Each line is a JSON representation of a TasteProfile.
"""

import json
import random
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List

# Allow imports from repo root when running script directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.models import Venue, RankedItem, TasteContext, TasteProfile


SEED = 42
N_USERS = 1000
CONTEXT_NAMES = ["default", "date_night", "solo_comfort"]

OCCASION_TAGS = ["solo", "date", "business", "group", "comfort"]

_FIRST_NAMES = [
    "Yuki", "Kenji", "Hana", "Takeshi", "Sakura", "Ryo", "Mei", "Daichi", "Aiko", "Hiroshi",
    "Yumi", "Kaito", "Nao", "Shin", "Mika", "Takumi", "Haruto", "Rin", "Yuta", "Sora",
    "Asuka", "Ren", "Koharu", "Minato", "Yui", "Sosuke", "Akari", "Hayato", "Rei", "Itsuki",
    "Kokoro", "Yamato", "Mio", "Haruki", "Tsubasa", "Kazuki", "Nanami", "Ryota", "Hotaru", "Taiga",
    "Emi", "Shota", "Ayaka", "Kenta", "Yuna", "Kohei", "Honoka", "Riku", "Arisa", "Jun",
    "Mao", "Satoshi", "Nana", "Takashi", "Nozomi", "Subaru", "Erika", "Kei", "Hitomi", "Masaki",
    "Miyu", "Toru", "Saki", "Kenshin", "Sayaka", "Naoki", "Kanna", "Daiki", "Riko", "Genta",
    "Maki", "Kosuke", "Yoko", "Sho", "Fumiko", "Yusuke", "Chihiro", "Aoi", "Risa", "Toshi",
    "Mami", "Keita", "Ema", "Go", "Fuka", "Shinji", "Miri", "Issei", "Karin", "Tatsuya",
    "Misa", "Koki", "Natsuki", "Tomoya", "Suzu", "Akito", "Alex", "Jordan", "Sam", "Taylor",
    "Casey", "Morgan", "Riley", "Quinn", "Avery", "Jules", "Priya", "Luca", "Sofia", "Hugo",
    "Mei-Lin", "Omar", "Inara", "Dmitri", "Eloise", "Rafael", "Zara", "Nico", "Wei", "Minji",
    "Diego", "Kaia", "Amir", "Chloe", "Kaz", "Layla", "Ethan", "Nuwa", "Igor", "Freya",
    "Anika", "Soren", "Mira", "Tomas", "Aya", "Vik", "Esme", "Jin", "Cleo", "Bogdan",
    "Lina", "Leo", "Indra", "Faye", "Raul", "Momo", "Cyrus", "Asha", "Yuuto", "Nadia",
    "Cormac", "Teo", "Vera", "Xiang", "Ilse", "Noa", "Tariq", "Suki", "Aldo", "Rona",
    "Kito", "Isla", "Farhan", "Umi", "Bran", "Solana", "Taro", "Anya", "Joao", "Sai",
    "Keira", "Oskar", "Reina", "Zian", "Calla", "Dante", "Kira", "Ludo", "Mana", "Elio",
    "Yuna", "Fizan", "Tove", "Ryo", "Azesha", "Piotr", "Sena", "Henri", "Marin", "Khaled",
    "Romy", "Tae", "Ebele", "Arkady", "Nori", "Omori", "Leila", "Henning", "Suri", "Jari",
    "Stella", "Jasper", "Xiu", "Filo", "Zelda", "Benja", "Ami", "Dario", "Juno", "Kai",
    "Lena", "Milo", "Nia", "Orion", "Pia", "Remy", "Sasha", "Theo", "Uma", "Vera",
    "Wren", "Xena", "Yara", "Zane", "Ada", "Beau", "Cara", "Dean", "Elle", "Finn",
    "Gia", "Hugo", "Iris", "Jace", "Kara", "Leo", "Mae", "Nash", "Olive", "Pax",
    "Quinn", "Reese", "Stella", "Tate", "Uma", "Vince", "Willa", "Xander", "Yara", "Zack",
    "Aria", "Blake", "Cora", "Drew", "Eva", "Felix", "Grace", "Hank", "Ivy", "Jack",
    "Kira", "Liam", "Mia", "Noah", "Olivia", "Parker", "Quinn", "Ryan", "Sofia", "Tyler",
    "Uma", "Violet", "Will", "Ximena", "Yosef", "Zoe", "Adam", "Bella", "Caleb", "Diana",
    "Eli", "Faith", "Gabriel", "Hannah", "Isaac", "Julia", "Kevin", "Luna", "Mason", "Nora",
    "Oscar", "Penelope", "Quentin", "Ruby", "Sebastian", "Tessa", "Uriel", "Victoria", "Wyatt", "Xena",
    "Yasmine", "Zachary",
]

_LAST_INITIALS = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
]


def _get_user_name(user_id: str) -> str:
    """Deterministic display name for a synthetic user_id (e.g. user_000 → 'Haruto T.')."""
    try:
        idx = int(user_id.split("_")[1])
    except (IndexError, ValueError):
        idx = 0
    rng = random.Random(SEED + idx)
    first = rng.choice(_FIRST_NAMES)
    last_initial = rng.choice(_LAST_INITIALS)
    return f"{first} {last_initial}."

CUISINES_POOL = [
    "Italian",
    "Japanese",
    "Mexican",
    "Indian",
    "French",
    "Chinese",
    "Korean",
    "Thai",
    "Middle Eastern",
    "Seafood",
    "Steakhouse",
    "Vegetarian",
    "Vegan",
    "Bakery",
    "Taiwanese",
    "Nordic",
]

DIETARY_TAGS = ["meat", "fish", "vegetarian", "vegan", "pescatarian"]


def _make_venue_pool(rng: random.Random) -> list[Venue]:
    """Generate a static pool of 20 synthetic venues."""
    venues: list[Venue] = []
    for i in range(20):
        n_cuisines = rng.randint(1, 3)
        cuisines = rng.sample(CUISINES_POOL, n_cuisines)
        n_diet = rng.randint(0, 2)
        dietary = rng.sample(DIETARY_TAGS, n_diet) if n_diet > 0 else []
        lat = 35.6 + rng.random() * 0.2  # Tokyo-ish latitudes
        lng = 139.6 + rng.random() * 0.3  # Tokyo-ish longitudes
        venues.append(
            Venue(
                id=f"venue_{i:03d}",
                name=f"Bistro {i + 1}",
                location={"lat": round(lat, 6), "lng": round(lng, 6)},
                cuisines=cuisines,
                dietary_tags=dietary,
                price_tier=rng.randint(1, 4),
                health_score=round(rng.random(), 2),
                source="synthetic",
            )
        )
    return venues


def _generate_context(
    rng: random.Random,
    venue_pool: list[Venue],
    context_id: str,
    user_idx: int,
) -> TasteContext:
    """Generate a single TasteContext with 5-12 ranked items."""
    n_items = rng.randint(5, 12)
    selected = rng.sample(venue_pool, min(n_items, len(venue_pool)))

    ranked_list: list[RankedItem] = []
    base_date = datetime(2024, 1, 1, tzinfo=timezone.utc)
    for pos, venue in enumerate(selected):
        # Stagger visited_at over the past ~2 years
        days_offset = rng.randint(0, 730)
        hours_offset = rng.randint(0, 23)
        visited_at = base_date + timedelta(days=days_offset, hours=hours_offset)
        occasion = rng.choice(OCCASION_TAGS)
        is_classic = rng.random() < 0.15  # ~15% classics
        ranked_list.append(
            RankedItem(
                venue=venue,
                visited_at=visited_at,
                occasion_tag=occasion,  # type: ignore[arg-type]
                is_classic=is_classic,
            )
        )
    return TasteContext(
        context_id=context_id,
        ranked_list=ranked_list,
    )


def generate_profiles(
    seed: int = SEED,
    n_users: int = N_USERS,
) -> list[TasteProfile]:
    """Generate synthetic taste profiles deterministically."""
    rng = random.Random(seed)
    venue_pool = _make_venue_pool(rng)

    profiles: list[TasteProfile] = []
    for u in range(n_users):
        user_id = f"user_{u:03d}"
        contexts: dict[str, TasteContext] = {}
        for ctx_name in CONTEXT_NAMES:
            # Use a per-context seed for variety while remaining deterministic
            ctx_rng = random.Random(seed + u * 1000 + hash(ctx_name) % 1000)
            contexts[ctx_name] = _generate_context(ctx_rng, venue_pool, ctx_name, u)

        profiles.append(
            TasteProfile(
                user_id=user_id,
                contexts=contexts,
                default_context="default",
            )
        )
    return profiles


def main() -> None:
    profiles = generate_profiles()
    for profile in profiles:
        print(profile.model_dump_json())


if __name__ == "__main__":
    main()
