from fastapi import FastAPI
from .models import TasteProfile, Venue, RankedItem
from .similarity import kendall_similarity

app = FastAPI(title="taste.node")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/similarity")
def compute_similarity(profile_a: TasteProfile, profile_b: TasteProfile):
    """
    Demo endpoint: send two taste profiles, get back their similarity score.
    """
    score = kendall_similarity(profile_a, profile_b)
    return {
        "similarity": score,
        "shared_venues": len(
            set(i.venue.id for i in profile_a.ranked_list)
            & set(i.venue.id for i in profile_b.ranked_list)
        ),
    }
