#!/usr/bin/env python3
"""
taste.node — Seed ALL demo data into Supabase

Run with service role key:
    SUPABASE_URL=https://zhygstfypymsspfinhqc.supabase.co \
    SUPABASE_SERVICE_KEY=YOUR_KEY \
    python scripts/seed_all_demo_data.py

Seeds:
    - 100 demo profiles
    - 100+ contexts
    - ~1,000 ranked_items
    - ~2,000 follow relationships
    - 334 feed_posts (with recent dates + likes)

Requires: supabase-py (pip install supabase)
"""

import os
import sys
import json
import random
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any

# Add project root to path so we can import shared modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def hash_string(s: str) -> int:
    h = 0
    for ch in s:
        h = (h << 5) - h + ord(ch)
        h |= 0xFFFFFFFF
    return h & 0xFFFFFFFF


def seeded_random(seed: int):
    state = seed & 0xFFFFFFFF
    while True:
        state = (state * 1103515245 + 12345) & 0x7FFFFFFF
        yield state


def seeded_hash(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) & 0xFFFFFFFF
    return h & 0xFFFFFFFF


def compute_power_law_likes(post_id: str) -> int:
    h = seeded_hash(post_id)
    tier_roll = h % 100
    fine_roll = h // 100
    if tier_roll < 43:
        return fine_roll % 31  # casual: 0-30
    elif tier_roll < 73:
        return 30 + (fine_roll % 271)  # popular: 30-300
    elif tier_roll < 92:
        return 300 + (fine_roll % 701)  # trending: 300-1000
    elif tier_roll < 98:
        return 1000 + (fine_roll % 4001)  # viral: 1000-5000
    else:
        return 5000 + (fine_roll % 5001)  # super-viral: 5000-10000


def load_venues() -> List[Dict[str, Any]]:
    """Load venue data from the static JSON file."""
    venue_path = os.path.join(os.path.dirname(__file__), "..", "web", "src", "data", "venues.json")
    with open(venue_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("venues", data)[:10000]  # cap at 10K for speed


def generate_user_profiles(n_users: int = 100) -> List[Dict[str, Any]]:
    """Generate deterministic demo user profiles."""
    first_names = [
        "You", "Alex", "Jordan", "Sam", "Sumer",
        "Yuki", "Kenji", "Hana", "Takeshi", "Sakura",
        "Ryo", "Mei", "Daichi", "Aiko", "Hiroshi",
        "Yumi", "Kaito", "Nao", "Shin", "Mika",
        "Takumi", "Haruto", "Rin", "Yuta", "Sora",
        "Asuka", "Ren", "Koharu", "Minato", "Yui",
        "Sosuke", "Akari", "Hayato", "Rei", "Itsuki",
        "Kokoro", "Yamato", "Mio", "Haruki", "Tsubasa",
        "Kazuki", "Nanami", "Ryota", "Hotaru", "Taiga",
        "Emi", "Shota", "Ayaka", "Kenta", "Yuna",
        "Kohei", "Honoka", "Riku", "Arisa", "Jun",
        "Mao", "Satoshi", "Kanna", "Fumio", "Karin",
        "Suzuki", "Rikuto", "Hinata", "Kenta", "Takara",
        "Hiro", "Rina", "Takumi", "Sota", "Yuki",
        "Makoto", "Nanae", "Ren", "Haruka", "Kiko",
        "Maria", "Atsushi", "Ryo", "Chihiro", "Yuto",
        "Tomoki", "Kirara", "Daiki", "Mai", "Kotone",
        "Shota", "Rina", "Haru", "Subaru", "Kanna",
        "Yuta", "Koki", "Yoshiko", "Taiki", "Minori",
        "Kazuya", "Miki", "Katsuya", "Nana", "Hayato",
    ]
    
    users = []
    for i in range(n_users):
        user_id = "sumer_aiand" if i == 4 else f"u{i+1:03d}"
        name = first_names[i] if i < len(first_names) else f"User {i+1}"
        if i >= 5:
            name += f" {chr(65 + (i % 26))}."
        users.append({
            "user_id": user_id,
            "name": name,
            "default_context": "default",
            "include_in_clustering": True,
        })
    return users


def seed_profiles(supabase, users: List[Dict[str, Any]]):
    """Upsert all demo profiles into Supabase."""
    print(f"Seeding {len(users)} profiles...")
    # Upsert in batches of 50
    for i in range(0, len(users), 50):
        batch = users[i:i+50]
        try:
            supabase.table("profiles").upsert(batch, on_conflict="user_id").execute()
            print(f"  ✓ profiles {i+1}-{min(i+50, len(users))}")
        except Exception as e:
            print(f"  ✗ profiles {i+1}-{min(i+50, len(users))} error: {e}")


def seed_contexts(supabase, users: List[Dict[str, Any]]):
    """Seed contexts for all demo users."""
    contexts = []
    for user in users:
        contexts.append({
            "context_id": "default",
            "user_id": user["user_id"],
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-06-28T00:00:00+00:00",
        })
        if user["user_id"] == "sumer_aiand":
            for ctx_name in ["date_nights", "lunch_hunts", "solo_spots", "group_dinners", "cheap_eats"]:
                contexts.append({
                    "context_id": ctx_name,
                    "user_id": user["user_id"],
                    "created_at": "2026-02-01T00:00:00+00:00",
                    "updated_at": "2026-06-28T00:00:00+00:00",
                })
    
    print(f"Seeding {len(contexts)} contexts...")
    for i in range(0, len(contexts), 50):
        batch = contexts[i:i+50]
        try:
            supabase.table("contexts").upsert(batch, on_conflict="user_id,context_id").execute()
            print(f"  ✓ contexts {i+1}-{min(i+50, len(contexts))}")
        except Exception as e:
            print(f"  ✗ contexts {i+1}-{min(i+50, len(contexts))} error: {e}")


def seed_ranked_items(supabase, users: List[Dict[str, Any]], venues: List[Dict[str, Any]]):
    """Seed ranked items for all demo users."""
    print("Generating ranked items...")
    items = []
    
    STATUS_WEIGHTS = ["favourite"] * 5 + ["visited"] * 6 + ["wishlist"] * 2
    OCCASIONS = ["solo", "date", "business", "group", "comfort"]
    MEALS = ["lunch", "dinner"]
    
    def get_reaction(venue: Dict[str, Any], rnd) -> str | None:
        pool = [
            f"The {venue.get('cuisines', ['food'])[0]} here is consistently excellent.",
            "A hidden gem. Worth the trip every time.",
            f"Best {venue.get('cuisines', ['food'])[0]} spot in the neighbourhood.",
            "Reliable, consistent, always satisfying.",
            "A bit pricey but you get what you pay for.",
            "Perfect atmosphere for a relaxed evening.",
            "The dishes here have real soul.",
            "Crowded on weekends — book ahead.",
            "Understated excellence. Nothing flashy, just good.",
            "Would bring out-of-town guests here without hesitation.",
            f"If you love {venue.get('cuisines', ['food'])[0]} this is the place.",
            "Consistently solid. My regular spot.",
        ]
        return pool[rnd() % len(pool)]
    
    for user in users:
        user_id = user["user_id"]
        seed = hash_string(user_id)
        rnd_gen = seeded_random(seed)
        is_sumer = user_id == "sumer_aiand"
        count = 153 if is_sumer else 8 + (seeded_random(seed + 1).send(None) % 7)
        
        # Shuffle venue indices deterministically
        indices = list(range(len(venues)))
        idx = seed % len(venues)
        shuffled = []
        for i in range(min(len(venues), count * 2)):
            idx = (idx * 7 + i * 13 + 31) % len(venues)
            if idx not in shuffled:
                shuffled.append(idx)
        
        selected = []
        for i, venue_idx in enumerate(shuffled):
            if len(selected) >= count:
                break
            venue = venues[venue_idx]
            status = random.choice(STATUS_WEIGHTS)  # random but seeded would be better
            selected.append({
                "venue": venue,
                "status": status,
                "occasion_tag": random.choice(OCCASIONS),
                "meal_type": random.choice(MEALS) if status != "wishlist" else None,
                "is_classic": random.random() < (0.08 if is_sumer else 0.15),
                "personal_rating": random.choice([None, 3, 4, 5, 5]) if random.random() < 0.8 else None,
                "reaction": get_reaction(venue, seeded_random(hash_string(venue["id"] + user_id))).__next__ if status in ("favourite", "visited") else None,
                "rank": i + 1,
            })
        
        # Assign to contexts
        if is_sumer:
            slices = {
                "default": selected[:50],
                "date_nights": selected[50:70],
                "lunch_hunts": selected[70:90],
                "solo_spots": selected[90:110],
                "group_dinners": selected[110:133],
                "cheap_eats": selected[133:153],
            }
        else:
            slices = {"default": selected[:max(1, len(selected) // 2)]}
            if random.random() < 0.4:
                extra = random.choice(["date_nights", "solo_spots", "group_dinners", "lunch_hunts", "cheap_eats"])
                slices[extra] = selected[max(1, len(selected) // 2):]
        
        for ctx_name, ctx_items in slices.items():
            for item in ctx_items:
                items.append({
                    "user_id": user_id,
                    "context_id": ctx_name,
                    "venue": item["venue"],
                    "visited_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(14, 180))).isoformat(),
                    "added_at": "2026-06-22T10:00:00+00:00",
                    "occasion_tag": item["occasion_tag"],
                    "is_classic": item["is_classic"],
                    "status": item["status"],
                    "personal_rating": item["personal_rating"],
                    "reaction": item["reaction"],
                    "meal_type": item["meal_type"],
                    "dishes": [],
                    "rank": item["rank"],
                })
    
    print(f"Seeding {len(items)} ranked items...")
    for i in range(0, len(items), 50):
        batch = items[i:i+50]
        try:
            supabase.table("ranked_items").upsert(batch, on_conflict="user_id,context_id,venue->id").execute()
            print(f"  ✓ ranked_items {i+1}-{min(i+50, len(items))}")
        except Exception as e:
            print(f"  ✗ ranked_items {i+1}-{min(i+50, len(items))} error: {e}")


def seed_follows(supabase, users: List[Dict[str, Any]]):
    """Seed follow relationships. ~80% of users follow sumer."""
    print("Generating follows...")
    follows = []
    sumer_id = "sumer_aiand"
    
    for user in users:
        follower_id = user["user_id"]
        if follower_id == sumer_id:
            continue
        
        # 80% chance to follow sumer
        if hash_string(follower_id + "follow_sumer") % 100 < 80:
            follows.append({"follower_id": follower_id, "following_id": sumer_id})
        
        # Random follows to other users (15-30% chance each)
        for other in users:
            if other["user_id"] == follower_id or other["user_id"] == sumer_id:
                continue
            if hash_string(follower_id + other["user_id"]) % 100 < 20:
                follows.append({"follower_id": follower_id, "following_id": other["user_id"]})
    
    print(f"Seeding {len(follows)} follows...")
    for i in range(0, len(follows), 50):
        batch = follows[i:i+50]
        try:
            supabase.table("follows").upsert(batch, on_conflict="follower_id,following_id").execute()
            print(f"  ✓ follows {i+1}-{min(i+50, len(follows))}")
        except Exception as e:
            print(f"  ✗ follows {i+1}-{min(i+50, len(follows))} error: {e}")


def seed_feed_posts(supabase, users: List[Dict[str, Any]], venues: List[Dict[str, Any]]):
    """Seed demo posts. Existing posts are kept; new ones are added."""
    print("Generating feed posts...")
    posts = []
    now = datetime.now(timezone.utc)
    
    # Generate ~3-5 posts per user
    for user in users:
        user_id = user["user_id"]
        name = user["name"]
        n_posts = 2 + (hash_string(user_id) % 4)  # 2-5 posts
        
        for j in range(n_posts):
            post_id = f"p_{user_id}_{j}"
            venue = random.choice(venues)
            likes = compute_power_law_likes(post_id)
            offset_hours = hash_string(post_id) % 48
            created_at = (now - timedelta(hours=offset_hours)).isoformat()
            
            posts.append({
                "id": post_id,
                "author_id": user_id,
                "author_name": name,
                "text": f"Have been here {likes % 5 + 1} times. Always a great experience.",
                "venue_id": venue["id"],
                "venue_name": venue["name"],
                "image_url": venue.get("image_url"),
                "likes": likes,
                "created_at": created_at,
            })
    
    print(f"Seeding {len(posts)} feed posts...")
    for i in range(0, len(posts), 50):
        batch = posts[i:i+50]
        try:
            supabase.table("feed_posts").upsert(batch, on_conflict="id").execute()
            print(f"  ✓ feed_posts {i+1}-{min(i+50, len(posts))}")
        except Exception as e:
            print(f"  ✗ feed_posts {i+1}-{min(i+50, len(posts))} error: {e}")


def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required")
        sys.exit(1)
    
    try:
        from supabase import create_client
        supabase = create_client(url, key)
    except ImportError:
        print("Error: supabase-py not installed. Run: pip install supabase")
        sys.exit(1)
    
    print("=" * 60)
    print("taste.node — Seeding all demo data into Supabase")
    print("=" * 60)
    
    users = generate_user_profiles()
    print(f"Generated {len(users)} demo users")
    
    venues = load_venues()
    print(f"Loaded {len(venues)} venues")
    
    seed_profiles(supabase, users)
    seed_contexts(supabase, users)
    seed_ranked_items(supabase, users, venues)
    seed_follows(supabase, users)
    seed_feed_posts(supabase, users, venues)
    
    print("=" * 60)
    print("Done! All demo data seeded to Supabase.")
    print("=" * 60)


if __name__ == "__main__":
    main()
