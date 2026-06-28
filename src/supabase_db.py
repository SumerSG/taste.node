"""taste.node — Supabase DB operations (supabase-py client)."""

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Generator, List, Optional

from src.models import (
    TasteProfile,
    TasteContext,
    RankedItem,
    RankedItemInput,
    Venue,
)

try:
    from supabase import create_client
except ImportError:  # pragma: no cover
    create_client = None  # type: ignore[misc, assignment]

_url = os.environ.get("SUPABASE_URL")
_key = os.environ.get("SUPABASE_SERVICE_KEY")
_client = create_client(_url, _key) if (create_client and _url and _key) else None


# ─── helpers ───

def has_supabase() -> bool:
    return _client is not None


def _parse_dt(value: Any) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value  # type: ignore[return-value]


def _to_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value]
    if isinstance(value, str):
        # Defensive: handle comma-separated or JSON-string edge cases
        try:
            import json
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(v) for v in parsed]
        except Exception:
            pass
        return []
    return []


def _venue_from_data(data: Dict[str, Any]) -> Venue:
    return Venue(
        id=data.get("id", ""),
        name=data.get("name", ""),
        location=data.get("location"),
        cuisines=_to_list(data.get("cuisines")),
        dietary_tags=_to_list(data.get("dietary_tags")),
        price_tier=data.get("price_tier"),
        health_score=data.get("health_score"),
        source=data.get("source", "synthetic"),  # type: ignore[arg-type]
        image_url=data.get("image_url"),
        rating=data.get("rating"),
        review_count=data.get("review_count"),
        address=data.get("address"),
        source_url=data.get("source_url"),
    )


def _venue_to_data(venue: Venue) -> Dict[str, Any]:
    return {
        "id": venue.id,
        "name": venue.name,
        "location": venue.location,
        "cuisines": venue.cuisines or [],
        "dietary_tags": venue.dietary_tags or [],
        "price_tier": venue.price_tier,
        "health_score": venue.health_score,
        "source": venue.source,
        "image_url": venue.image_url,
        "rating": venue.rating,
        "review_count": venue.review_count,
        "address": venue.address,
        "source_url": venue.source_url,
    }


def _row_to_ranked_item(row: Dict[str, Any]) -> RankedItem:
    venue_data = row.get("venue") or {}
    return RankedItem(
        venue=_venue_from_data(venue_data),
        visited_at=_parse_dt(row.get("visited_at")),
        added_at=_parse_dt(row.get("added_at")),
        occasion_tag=row.get("occasion_tag", "solo"),  # type: ignore[arg-type]
        is_classic=row.get("is_classic", False),
        status=row.get("status"),  # type: ignore[arg-type]
        personal_rating=row.get("personal_rating"),
        reaction=row.get("reaction"),
        meal_type=row.get("meal_type"),  # type: ignore[arg-type]
        dishes=_to_list(row.get("dishes")),
    )


# ─── Connection shim ───


def get_db() -> Generator[None, None, None]:
    """FastAPI dependency generator — no-op for Supabase (client is global)."""
    yield None


def init_db(database_url: str = "sqlite:///./taste_node.db") -> None:
    """No-op when using Supabase; schema is managed by Supabase migrations."""
    return None


# ─── Profile / User ───


def get_user_profile(conn: Any, user_id: str) -> Optional[TasteProfile]:
    if not _client:
        return None

    prof_resp = (
        _client.table("profiles")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    if not prof_resp.data:
        return None

    prof = prof_resp.data[0]

    ctx_resp = (
        _client.table("contexts")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    contexts: Dict[str, TasteContext] = {}
    for ctx_row in ctx_resp.data:
        cid = ctx_row["context_id"]
        items_resp = (
            _client.table("ranked_items")
            .select("*")
            .eq("context_id", cid)
            .eq("user_id", user_id)
            .execute()
        )
        ranked_list = [_row_to_ranked_item(r) for r in items_resp.data]
        contexts[cid] = TasteContext(
            context_id=cid,
            ranked_list=ranked_list,
            created_at=_parse_dt(ctx_row.get("created_at")),
            updated_at=_parse_dt(ctx_row.get("updated_at")),
        )

    return TasteProfile(
        user_id=user_id,
        contexts=contexts,
        default_context=prof.get("default_context", "default"),
        include_in_clustering=prof.get("include_in_clustering", True),
    )


def create_user(
    conn: Any,
    user_id: str,
    email: Optional[str] = None,
    **kwargs: Any,
) -> TasteProfile:
    if not _client:
        raise RuntimeError("Supabase client is not configured")

    now = datetime.now(timezone.utc)
    _client.table("profiles").insert({
        "user_id": user_id,
        "default_context": "default",
        "include_in_clustering": True,
        "created_at": now.isoformat(),
    }).execute()

    _client.table("contexts").insert({
        "context_id": "default",
        "user_id": user_id,
        "name": kwargs.get("name", "default"),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }).execute()

    return TasteProfile(
        user_id=user_id,
        contexts={
            "default": TasteContext(
                context_id="default",
                ranked_list=[],
                created_at=now,
                updated_at=now,
            )
        },
        default_context="default",
        include_in_clustering=True,
    )


def update_user_settings(
    conn: Any,
    user_id: str,
    include_in_clustering: bool,
) -> None:
    if not _client:
        return
    _client.table("profiles").update({
        "include_in_clustering": include_in_clustering,
    }).eq("user_id", user_id).execute()


# ─── Contexts / Ranked Items ───


def upsert_context(
    conn: Any,
    user_id: str,
    context_id: str,
    items: List[RankedItemInput],
) -> TasteContext:
    if not _client:
        raise RuntimeError("Supabase client is not configured")

    now = datetime.now(timezone.utc)

    # Ensure user exists
    prof_check = (
        _client.table("profiles")
        .select("user_id")
        .eq("user_id", user_id)
        .execute()
    )
    if not prof_check.data:
        create_user(conn, user_id)

    # Upsert context row
    ctx_check = (
        _client.table("contexts")
        .select("context_id")
        .eq("context_id", context_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not ctx_check.data:
        _client.table("contexts").insert({
            "context_id": context_id,
            "user_id": user_id,
            "name": context_id,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }).execute()
    else:
        _client.table("contexts").update({
            "updated_at": now.isoformat(),
        }).eq("context_id", context_id).eq("user_id", user_id).execute()

    # Deduplicate by venue_id (keep most recent visited_at)
    seen: Dict[str, RankedItemInput] = {}
    for inp in items:
        key = inp.venue_id
        if key not in seen or inp.visited_at > seen[key].visited_at:
            seen[key] = inp

    # Build RankedItems
    ranked_list: List[RankedItem] = []
    for inp in seen.values():
        venue = Venue(
            id=inp.venue_id,
            name=inp.venue_name or inp.venue_id,
            source="user_added",
        )
        ranked_list.append(
            RankedItem(
                venue=venue,
                visited_at=inp.visited_at,
                occasion_tag=inp.occasion_tag,
                is_classic=inp.is_classic,
                status=inp.status,
                personal_rating=inp.personal_rating,
                reaction=inp.reaction,
                meal_type=inp.meal_type,
                dishes=inp.dishes,
            )
        )

    # Replace all items for this context
    _client.table("ranked_items").delete().eq("context_id", context_id).eq(
        "user_id", user_id
    ).execute()

    if ranked_list:
        insert_rows = []
        for item in ranked_list:
            insert_rows.append({
                "id": str(uuid.uuid4()),
                "context_id": context_id,
                "user_id": user_id,
                "venue": _venue_to_data(item.venue),
                "visited_at": item.visited_at.isoformat(),
                "added_at": item.added_at.isoformat(),
                "occasion_tag": item.occasion_tag,
                "is_classic": item.is_classic,
                "status": item.status,
                "personal_rating": item.personal_rating,
                "reaction": item.reaction,
                "meal_type": item.meal_type,
                "dishes": item.dishes or [],
            })
        _client.table("ranked_items").insert(insert_rows).execute()

    return TasteContext(
        context_id=context_id,
        ranked_list=ranked_list,
        created_at=now,
        updated_at=now,
    )


# ─── Profiles bulk read ───


def get_all_profiles(conn: Any) -> List[TasteProfile]:
    if not _client:
        return []

    # Paginate profile IDs in case the table grows beyond PostgREST default limits
    all_ids: List[str] = []
    start = 0
    batch = 1000
    while True:
        prof_resp = (
            _client.table("profiles")
            .select("user_id")
            .range(start, start + batch - 1)
            .execute()
        )
        batch_ids = [r["user_id"] for r in prof_resp.data]
        if not batch_ids:
            break
        all_ids.extend(batch_ids)
        if len(batch_ids) < batch:
            break
        start += batch

    profiles: List[TasteProfile] = []
    for uid in all_ids:
        profile = get_user_profile(conn, uid)
        if profile:
            profiles.append(profile)
    return profiles


# ─── Venues ───


def get_all_venues(conn: Any) -> List[Venue]:
    if not _client:
        return []
    # Paginate to bypass default PostgREST/supabase-py row limits
    venues: List[Venue] = []
    start = 0
    batch = 1000
    while True:
        resp = (
            _client.table("venues")
            .select("*")
            .range(start, start + batch - 1)
            .execute()
        )
        batch_data = resp.data
        if not batch_data:
            break
        venues.extend([_venue_from_data(r) for r in batch_data])
        if len(batch_data) < batch:
            break
        start += batch
    return venues


def seed_venues_if_empty(conn: Any) -> None:
    if not _client:
        return
    resp = _client.table("venues").select("id", count="exact", head=True).execute()
    count = getattr(resp, "count", None) or 0
    if count:
        return

    import src.recommendations as _rec
    _rec._ensure_venues_loaded()

    now = datetime.now(timezone.utc)
    rows = []
    for v in _rec.VENUE_POOL:
        rows.append({
            "id": v.id,
            "name": v.name,
            "address": v.address,
            "location": v.location,
            "cuisines": v.cuisines or [],
            "dietary_tags": v.dietary_tags or [],
            "price_tier": v.price_tier,
            "health_score": v.health_score,
            "source": v.source,
            "source_url": v.source_url,
            "image_url": v.image_url,
            "rating": v.rating,
            "review_count": v.review_count,
            "created_at": now.isoformat(),
        })

    if rows:
        _client.table("venues").insert(rows).execute()


# ─── Feed / Likes ───


def toggle_like_post(conn: Any, post_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Toggle like/unlike on a post. Returns {liked_by_me, likes} or None on error."""
    if not _client:
        return None

    try:
        # Check existing like
        existing = (
            _client.table("post_likes")
            .select("post_id")
            .eq("user_id", user_id)
            .eq("post_id", post_id)
            .execute()
        )
        has_liked = bool(existing.data)

        post_resp = (
            _client.table("feed_posts")
            .select("likes")
            .eq("id", post_id)
            .single()
            .execute()
        )
        current_likes = post_resp.data.get("likes", 0) if post_resp.data else 0

        if has_liked:
            # Unlike
            _client.table("post_likes").delete().eq("user_id", user_id).eq("post_id", post_id).execute()
            new_likes = max(0, current_likes - 1)
            _client.table("feed_posts").update({"likes": new_likes}).eq("id", post_id).execute()
            return {"liked_by_me": False, "likes": new_likes}
        else:
            # Like
            _client.table("post_likes").insert({"user_id": user_id, "post_id": post_id}).execute()
            new_likes = current_likes + 1
            _client.table("feed_posts").update({"likes": new_likes}).eq("id", post_id).execute()
            return {"liked_by_me": True, "likes": new_likes}
    except Exception as e:
        print("[supabase_db] toggle_like_post error:", e)
        return None
