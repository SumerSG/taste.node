from pydantic import BaseModel
from typing import List
from datetime import datetime, timezone


class Venue(BaseModel):
    id: str
    name: str


class RankedItem(BaseModel):
    venue: Venue
    rank: int  # 1 = top favourite
    added_at: datetime = datetime.now(timezone.utc)


class TasteProfile(BaseModel):
    user_id: str
    ranked_list: List[RankedItem]
