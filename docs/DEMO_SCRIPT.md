# taste.node — Demo Script

| | |
|:---|:---|
| **Status** | Rehearsal-Ready (Planned Trajectory) |
| **Runtime Target** | < 5 minutes from `git clone` to final recommendation |
| **Audience** | Mentors and stakeholders (non-engineers) |
| **Prerequisites** | Python 3.12, `git`, no external API keys, no internet required |

> **Planning-Only Notice:** This document describes the **intended** demo flow for Phase 5–6. Implementation code does not yet exist in this repository. See `PLANNING_HYGIENE.md`.

---

## 1. Setup (0:00–1:00)

```bash
# Clone
git clone https://github.com/SumerSG/taste.node.git
cd taste.node

# Virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install (exact pins)
pip install -r requirements.txt

# Verify tests are green
pytest -v
```

**Expected:** All tests pass. If any fail, STOP. Do not demo on a red build.

---

## 2. Start the Server (1:00–1:30)

```bash
uvicorn src.main:app --reload
```

**Expected:** Server boots on `http://localhost:8000`. Look for:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## 3. Onboard a Seed User (1:30–2:30)

Use **Alice** (guaranteed cluster assignment — hardcoded in synthetic data).

```bash
curl -X POST "http://localhost:8000/users" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "alice_42"}'
```

**What to say:** "Each user has contextual taste profiles. Let's create Alice and give her a default ranked list."

Add ranked items:

```bash
curl -X PUT "http://localhost:8000/users/alice_42/contexts/default" \
  -H "Content-Type: application/json" \
  -d '[
    {"venue_id": "ramen_ya", "venue_name": "Ramen-Ya", "visited_at": "2025-01-10T18:00:00+00:00", "occasion_tag": "solo"},
    {"venue_id": "sushi_zen", "venue_name": "Sushi-Zen", "visited_at": "2025-02-14T19:00:00+00:00", "occasion_tag": "date"},
    {"venue_id": "burger_01", "venue_name": "Burger-No1", "visited_at": "2025-03-01T12:00:00+00:00", "occasion_tag": "group"}
  ]'
```

**Expected:** Returns a `TasteContext` with 3 items.

---

## 4. Show Similarity (2:30–3:00)

Use **Bob**, another synthetic user with overlapping taste.

```bash
curl -X POST "http://localhost:8000/similarity?context_id=default" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_a": {"user_id": "alice_42", "contexts": {"default": {"context_id": "default", "ranked_list": [{"venue": {"id": "ramen_ya", "name": "Ramen-Ya"}, "visited_at": "2025-01-10T18:00:00+00:00", "occasion_tag": "solo"}, {"venue": {"id": "sushi_zen", "name": "Sushi-Zen"}, "visited_at": "2025-02-14T19:00:00+00:00", "occasion_tag": "date"}, {"venue": {"id": "burger_01", "name": "Burger-No1"}, "visited_at": "2025-03-01T12:00:00+00:00", "occasion_tag": "group"}]}}, "default_context": "default"},
    "profile_b": {"user_id": "bob_99", "contexts": {"default": {"context_id": "default", "ranked_list": [{"venue": {"id": "ramen_ya", "name": "Ramen-Ya"}, "visited_at": "2025-01-15T18:00:00+00:00", "occasion_tag": "solo"}, {"venue": {"id": "sushi_zen", "name": "Sushi-Zen"}, "visited_at": "2025-02-10T19:00:00+00:00", "occasion_tag": "date"}, {"venue": {"id": "pizza_nap", "name": "Pizza-Napoli"}, "visited_at": "2025-03-05T12:00:00+00:00", "occasion_tag": "group"}]}}, "default_context": "default"}
  }'
```

**What to say:** "Alice and Bob both love Ramen-Ya and Sushi-Zen. The system computes a normalized Kendall Tau distance to measure taste overlap."

**Expected:** `distance` is between `0.0` and `1.0`, `shared_venues >= 2`.

---

## 5. Run Clustering (3:00–3:30)

```bash
curl -X POST "http://localhost:8000/clusters/recalculate" \
  -H "Content-Type: application/json" \
  -d '{"context_id": "default"}'
```

**What to say:** "We use density-based clustering — HDBSCAN — because taste groups aren't perfect spheres. Some people are noise points; that's valid."

**Expected:** `n_clusters >= 1`, some users may be `noise_ids`.

---

## 6. Get Recommendations (3:30–4:30)

```bash
curl "http://localhost:8000/recommendations?user=alice_42&context_id=default&n=3"
```

**What to say:** "Alice gets recommendations from her taste cluster. Every recommendation includes a one-sentence explanation and a score."

**Expected:**
- Array of 3 recommendations.
- Each has `venue`, `score`, `explanation`, `context_id`.
- `explanation` is non-empty and <= 120 characters.

---

## 7. Cold-Start Fallback (4:30–5:00)

Use **Charlie**, a user with only 1 venue.

```bash
curl -X POST "http://localhost:8000/users" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "charlie_01"}'

curl -X PUT "http://localhost:8000/users/charlie_01/contexts/default" \
  -H "Content-Type: application/json" \
  -d '[
    {"venue_id": "taco_01", "venue_name": "Tacos-Locos", "visited_at": "2025-06-01T12:00:00+00:00", "occasion_tag": "solo"}
  ]'

curl "http://localhost:8000/recommendations?user=charlie_01&context_id=default&n=3"
```

**What to say:** "Charlie is a cold-start user with only one venue. The system gracefully falls back to popularity and filter match, and the explanation tells him to add more venues to unlock his cluster."

**Expected:** Recommendations return with a noise fallback explanation (e.g., "Popular among all users — add more venues to unlock your cluster.")

---

## 8. Failure Recovery Paths

| Failure | Likely Cause | Recovery |
|---|---|---|
| `pytest` fails | Dependency version drift or `src/models.py` non-compliance | Run `pip install -r requirements.txt --force-reinstall` and re-run `pytest` |
| Server won't start | Port 8000 in use | `uvicorn src.main:app --reload --port 8001` |
| HDBSCAN produces only noise | Too few synthetic users loaded | Ensure synthetic data script ran; run `python scripts/generate_synthetic_data.py --seed 42` |
| Recommendation array empty | User is noise AND no filters match | Add `cuisine` or `price_tier` filters, or use a user with >= 3 venues |
| Explanation missing | `recommendations.py` not implemented | Note: this is a known gap. Fallback: show `score` and `venue.name` only |

---

## 9. Timing Budget

| Step | Target |
|---|---|
| Clone + install | 60 s |
| pytest green | 15 s |
| Server boot | 10 s |
| Onboard Alice + add list | 45 s |
| Similarity demo | 20 s |
| Clustering demo | 20 s |
| Recommendations | 30 s |
| Cold-start fallback | 20 s |
| **Total** | **~3 min 40 s** |

---

## 10. Narrative Arc

1. **Hook:** "Discovery is broken — star ratings don't capture taste."
2. **Mechanism:** "Ranked lists + context + time decay = a better signal."
3. **Proof:** "Alice and Bob overlap. HDBSCAN finds the cluster."
4. **Value:** "Explainable recommendations — not black boxes."
5. **Grace:** "Even brand-new users get a friendly fallback."

---

*Script version: 1.0. Rehearse at least once before demo day. Do not modify `src/` during rehearsal — only docs and scripts.*
