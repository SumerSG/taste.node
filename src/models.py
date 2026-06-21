from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class Venue(BaseModel):
    id: str
    name: str
    # Future: cuisines, dietary_tags, location, price_tier


class RankedItem(BaseModel):
    """
    A temporal and contextual artifact reflecting biological and social reality.
    rank is a derived snapshot, not raw stored data.
    """
    venue: Venue
    visited_at: datetime         # Biological reality: when they physically ate there
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))  # System metadata
    occasion_tag: str = "solo"   # e.g., 'solo', 'date', 'business', 'group', 'comfort'
    # Future: mood_tags, group_size, weather

    def compute_derived_rank(
        self,
        reference_time: Optional[datetime] = None,
        decay_halflife_days: float = 365.0,
        context_boost: Optional[str] = None,
    ) -> float:
        """
        Compute a time-decayed, context-boosted rank score.
        Higher = more important.  A visit from two weeks ago weighs more than
        two years ago unless explicitly pinned as a 'classic'.
        """
        now = reference_time or datetime.now(timezone.utc)
        # Time decay: exponential decay with configurable halflife
        age_days = max(0.0, (now - self.visited_at).total_seconds() / 86400.0)
        if self.occasion_tag == "classic":
            decay = 1.0  # pinned classics do not decay
        else:
            decay = 2.0 ** (-age_days / decay_halflife_days)

        boost = 1.0
        if context_boost and self.occasion_tag == context_boost:
            boost = 1.5

        return decay * boost


class TasteContext(BaseModel):
    context_id: str              # e.g., 'date_night', 'solo_comfort', 'business_lunch'
    ranked_list: List[RankedItem]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TasteProfile(BaseModel):
    user_id: str
    contexts: Dict[str, TasteContext] = Field(default_factory=dict)
    default_context: str = "default"

    def get_context(self, context_id: Optional[str] = None) -> Optional[TasteContext]:
        cid = context_id or self.default_context
        return self.contexts.get(cid)

    def get_items(
        self,
        context_id: Optional[str] = None,
        apply_decay: bool = False,
        reference_time: Optional[datetime] = None,
    ) -> List[RankedItem]:
        """
        Return items for a context, optionally sorted by time-decayed derived rank.
        If apply_decay is True, items are returned in descending order of derived rank.
        """
        ctx = self.get_context(context_id)
        if ctx is None:
            return []
        items = list(ctx.ranked_list)
        if apply_decay:
            ref = reference_time or datetime.now(timezone.utc)
            items.sort(key=lambda item: item.compute_derived_rank(ref), reverse=True)
        return items
