"""taste.node — canonical Pydantic models per TDD v0.2 Chapter 2."""

from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field, computed_field, model_validator


class Venue(BaseModel):
    id: str
    name: str
    location: Optional[Dict[str, float]] = None  # {"lat": float, "lng": float}
    cuisines: List[str] = Field(default_factory=list)
    dietary_tags: List[str] = Field(default_factory=list)
    price_tier: Optional[int] = None  # 1–4
    health_score: Optional[float] = None
    source: Literal["synthetic", "api", "user_added"] = "synthetic"


class RankedItem(BaseModel):
    venue: Venue
    visited_at: datetime  # timezone-aware UTC
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    occasion_tag: Literal["solo", "date", "business", "group", "comfort"] = "solo"
    is_classic: bool = False  # bypasses time-decay

    @computed_field
    @property
    def rank(self) -> float:
        """Derived rank: stub in Phase 1; real logic in Phase 2 via similarity.py."""
        return 0.0


class TasteContext(BaseModel):
    context_id: str  # e.g. "default", "date_night", "solo_comfort"
    ranked_list: List[RankedItem]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TasteProfile(BaseModel):
    user_id: str
    contexts: Dict[str, TasteContext] = Field(default_factory=dict)
    default_context: str = "default"
    include_in_clustering: bool = True  # opt-out toggle for cluster calculations

    @model_validator(mode="after")
    def _default_context_exists(self):
        if self.default_context not in self.contexts:
            raise ValueError(
                f"default_context '{self.default_context}' must exist as a key in contexts"
            )
        return self


class ClusterResult(BaseModel):
    context_id: str
    labels: Dict[str, int] = Field(default_factory=dict)  # user_id -> cluster_label (-1 = noise)
    noise_ids: List[str] = Field(default_factory=list)
    n_clusters: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─── API Shapes ───

class RankedItemInput(BaseModel):
    """Used in PUT /users/{user_id}/contexts/{context_id}"""
    venue_id: str
    venue_name: Optional[str] = None
    visited_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    occasion_tag: Literal["solo", "date", "business", "group", "comfort"] = "solo"
    is_classic: bool = False


class Recommendation(BaseModel):
    venue: Venue
    score: float  # [0.0, 1.0]
    explanation: str
    context_id: str


class SettingsUpdate(BaseModel):
    """PATCH /users/{user_id}/settings"""
    include_in_clustering: bool


class ErrorResponse(BaseModel):
    error: str
    message: str
    detail: Optional[dict] = None
