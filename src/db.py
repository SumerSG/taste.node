"""taste.node — SQLite persistence layer (SQLAlchemy Core)."""

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Generator, List, Optional

from sqlalchemy import (
    create_engine,
    Table,
    Column,
    String,
    DateTime,
    Integer,
    Float,
    Boolean,
    MetaData,
    ForeignKey,
    ForeignKeyConstraint,
    JSON,
    PrimaryKeyConstraint,
    select,
    insert,
    update,
    delete,
)
from sqlalchemy.engine import Connection, Engine

try:
    from alembic.config import Config
    from alembic import command
except ImportError:  # pragma: no cover
    Config = None  # type: ignore[misc, assignment]
    command = None  # type: ignore[misc, assignment]

from src.models import (
    TasteProfile,
    TasteContext,
    RankedItem,
    Venue,
    RankedItemInput,
)

metadata = MetaData()

users_table = Table(
    "users",
    metadata,
    Column("user_id", String, primary_key=True),
    Column("default_context", String, nullable=False, default="default"),
    Column("include_in_clustering", Boolean, nullable=False, default=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

contexts_table = Table(
    "contexts",
    metadata,
    Column("context_id", String, nullable=False),
    Column("user_id", String, ForeignKey("users.user_id"), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    # Composite primary key so each user can have their own "default" context
    PrimaryKeyConstraint("context_id", "user_id"),
)

ranked_items_table = Table(
    "ranked_items",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("context_id", String, nullable=False),
    Column("user_id", String, nullable=False),
    Column("venue_id", String, nullable=False),
    Column("venue_name", String, nullable=False),
    Column("venue_location", JSON, nullable=True),
    Column("venue_cuisines", JSON, nullable=False, default=list),
    Column("venue_dietary_tags", JSON, nullable=False, default=list),
    Column("venue_price_tier", Integer, nullable=True),
    Column("venue_health_score", Float, nullable=True),
    Column("venue_source", String, nullable=False, default="synthetic"),
    Column("visited_at", DateTime(timezone=True), nullable=False),
    Column("added_at", DateTime(timezone=True), nullable=False),
    Column("occasion_tag", String, nullable=False, default="solo"),
    Column("is_classic", Boolean, nullable=False, default=False),
    Column("status", String, nullable=True),
    Column("personal_rating", Integer, nullable=True),
    Column("reaction", String, nullable=True),
    Column("meal_type", String, nullable=True),
    Column("dishes", JSON, nullable=True),
    ForeignKeyConstraint(
        ["context_id", "user_id"],
        ["contexts.context_id", "contexts.user_id"],
    ),
)

venues_table = Table(
    "venues",
    metadata,
    Column("id", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("address", String, nullable=True),
    Column("location", JSON, nullable=True),
    Column("cuisines", JSON, nullable=False, default=list),
    Column("dietary_tags", JSON, nullable=False, default=list),
    Column("price_tier", Integer, nullable=True),
    Column("health_score", Float, nullable=True),
    Column("source", String, nullable=False, default="synthetic"),
    Column("source_url", String, nullable=True),
    Column("image_url", String, nullable=True),
    Column("rating", Float, nullable=True),
    Column("review_count", Integer, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

# Global engine reference; initialized on first use
_engine: Optional[Engine] = None


def init_db(database_url: str = "sqlite:///./taste_node.db") -> Engine:
    """Create engine, run Alembic migrations, and return the engine instance."""
    global _engine
    if _engine is None:
        _engine = create_engine(database_url, connect_args={"check_same_thread": False})
        # Run Alembic migrations before falling back to create_all
        if Config is not None:
            try:
                alembic_cfg = Config("alembic.ini")
                command.upgrade(alembic_cfg, "head")
            except Exception:
                # If Alembic is unavailable or mis-configured, fall back to metadata.create_all
                pass
        metadata.create_all(_engine)
    return _engine


def get_db() -> Generator[Connection, None, None]:
    """FastAPI dependency generator yielding a transactional DB connection."""
    engine = init_db()
    with engine.begin() as conn:
        yield conn


# ─── CRUD helpers ───


def _row_to_ranked_item(row: Any) -> RankedItem:
    # SQLite round-trips may strip tzinfo → re-attach UTC if needed
    visited_at = row.visited_at
    if visited_at and visited_at.tzinfo is None:
        visited_at = visited_at.replace(tzinfo=timezone.utc)
    added_at = row.added_at
    if added_at and added_at.tzinfo is None:
        added_at = added_at.replace(tzinfo=timezone.utc)
    return RankedItem(
        venue=Venue(
            id=row.venue_id,
            name=row.venue_name,
            location=row.venue_location,
            cuisines=row.venue_cuisines or [],
            dietary_tags=row.venue_dietary_tags or [],
            price_tier=row.venue_price_tier,
            health_score=row.venue_health_score,
            source=row.venue_source,  # type: ignore[arg-type]
        ),
        visited_at=visited_at,
        added_at=added_at,
        occasion_tag=row.occasion_tag,  # type: ignore[arg-type]
        is_classic=row.is_classic,
        status=row.status,
        personal_rating=row.personal_rating,
        reaction=row.reaction,
        meal_type=row.meal_type,
        dishes=row.dishes or [],
    )


def _ranked_item_to_row(context_id: str, user_id: str, item: RankedItem) -> Dict[str, Any]:
    return {
        "context_id": context_id,
        "user_id": user_id,
        "venue_id": item.venue.id,
        "venue_name": item.venue.name,
        "venue_location": item.venue.location,
        "venue_cuisines": item.venue.cuisines or [],
        "venue_dietary_tags": item.venue.dietary_tags or [],
        "venue_price_tier": item.venue.price_tier,
        "venue_health_score": item.venue.health_score,
        "venue_source": item.venue.source,
        "visited_at": item.visited_at,
        "added_at": item.added_at,
        "occasion_tag": item.occasion_tag,
        "is_classic": item.is_classic,
        "status": item.status,
        "personal_rating": item.personal_rating,
        "reaction": item.reaction,
        "meal_type": item.meal_type,
        "dishes": item.dishes or [],
    }


def get_user_profile(conn: Any, user_id: str) -> Optional[TasteProfile]:
    """Load a full TasteProfile from the DB, or None."""
    user_row = conn.execute(select(users_table).where(users_table.c.user_id == user_id)).mappings().first()
    if user_row is None:
        return None

    ctx_rows = conn.execute(
        select(contexts_table).where(contexts_table.c.user_id == user_id)
    ).mappings().all()

    contexts: Dict[str, TasteContext] = {}
    for ctx_row in ctx_rows:
        ctx_id = ctx_row["context_id"]
        item_rows = conn.execute(
            select(ranked_items_table)
            .where(ranked_items_table.c.context_id == ctx_id)
            .where(ranked_items_table.c.user_id == user_id)
        ).mappings().all()

        ranked_list = [_row_to_ranked_item(r) for r in item_rows]
        contexts[ctx_id] = TasteContext(
            context_id=ctx_id,
            ranked_list=ranked_list,
            created_at=ctx_row["created_at"],
            updated_at=ctx_row["updated_at"],
        )

    return TasteProfile(
        user_id=user_id,
        contexts=contexts,
        default_context=user_row["default_context"],
        include_in_clustering=user_row.get("include_in_clustering", True),
    )


def create_user(conn: Any, user_id: str) -> TasteProfile:
    """Insert a new user with an empty default context."""
    now = datetime.now(timezone.utc)
    conn.execute(
        insert(users_table).values(
            user_id=user_id,
            default_context="default",
            include_in_clustering=True,
            created_at=now,
        )
    )
    conn.execute(
        insert(contexts_table).values(
            context_id="default",
            user_id=user_id,
            created_at=now,
            updated_at=now,
        )
    )
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
    """Toggle whether a user's taste data is included in cluster calculations."""
    conn.execute(
        update(users_table)
        .where(users_table.c.user_id == user_id)
        .values(include_in_clustering=include_in_clustering)
    )


def upsert_context(
    conn: Any,
    user_id: str,
    context_id: str,
    items: List[RankedItemInput],
) -> TasteContext:
    """Upsert a context's ranked list for a user.

    Deduplicates by venue_id (keeps most recent visited_at).
    Unknown venue_id creates a minimal Venue.
    """
    now = datetime.now(timezone.utc)

    # Ensure user exists
    user_row = conn.execute(
        select(users_table.c.user_id).where(users_table.c.user_id == user_id)
    ).first()
    if user_row is None:
        create_user(conn, user_id)

    # Ensure context row exists
    ctx_row = conn.execute(
        select(contexts_table.c.context_id)
        .where(contexts_table.c.context_id == context_id)
        .where(contexts_table.c.user_id == user_id)
    ).first()
    if ctx_row is None:
        conn.execute(
            insert(contexts_table).values(
                context_id=context_id,
                user_id=user_id,
                created_at=now,
                updated_at=now,
            )
        )
    else:
        conn.execute(
            update(contexts_table)
            .where(contexts_table.c.context_id == context_id)
            .where(contexts_table.c.user_id == user_id)
            .values(updated_at=now)
        )

    # Deduplicate inputs by venue_id (keep most recent visited_at)
    seen: Dict[str, RankedItemInput] = {}
    for inp in items:
        key = inp.venue_id
        if key not in seen or inp.visited_at > seen[key].visited_at:
            seen[key] = inp

    # Build RankedItems from deduplicated inputs
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
    conn.execute(
        delete(ranked_items_table)
        .where(ranked_items_table.c.context_id == context_id)
        .where(ranked_items_table.c.user_id == user_id)
    )
    for item in ranked_list:
        conn.execute(
            insert(ranked_items_table).values(_ranked_item_to_row(context_id, user_id, item))
        )

    return TasteContext(
        context_id=context_id,
        ranked_list=ranked_list,
        created_at=now,
        updated_at=now,
    )


def get_all_profiles(conn: Any) -> List[TasteProfile]:
    """Load every user profile from the DB."""
    user_rows = conn.execute(select(users_table.c.user_id)).mappings().all()
    profiles: List[TasteProfile] = []
    for row in user_rows:
        profile = get_user_profile(conn, row["user_id"])
        if profile:
            profiles.append(profile)
    return profiles


# ─── Venues ───

def _row_to_venue(row: Any) -> Venue:
    return Venue(
        id=row.id,
        name=row.name,
        address=row.address,
        location=row.location,
        cuisines=row.cuisines or [],
        dietary_tags=row.dietary_tags or [],
        price_tier=row.price_tier,
        health_score=row.health_score,
        source=row.source,
        source_url=row.source_url,
        image_url=row.image_url,
        rating=row.rating,
        review_count=row.review_count,
    )


def seed_venues_if_empty(conn: Any) -> None:
    """Populate the venues table from the static MVP pool if it is empty."""
    from src.recommendations import VENUE_POOL
    count = conn.execute(select(venues_table)).first()
    if count is not None:
        return
    now = datetime.now(timezone.utc)
    for v in VENUE_POOL:
        conn.execute(
            insert(venues_table).values(
                id=v.id,
                name=v.name,
                address=v.address,
                location=v.location,
                cuisines=v.cuisines or [],
                dietary_tags=v.dietary_tags or [],
                price_tier=v.price_tier,
                health_score=v.health_score,
                source=v.source,
                source_url=v.source_url,
                image_url=v.image_url,
                rating=v.rating,
                review_count=v.review_count,
                created_at=now,
            )
        )


def get_all_venues(conn: Any) -> List[Venue]:
    """Return every venue from the DB, or an empty list."""
    rows = conn.execute(select(venues_table)).mappings().all()
    return [_row_to_venue(r) for r in rows]
