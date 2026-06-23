# Offline Evaluation Plan

| | |
|:---|:---|
| **Status** | Planning |
| **Date** | 2026-06-22 |
| **Version** | 1.0 |

---

## 1. Purpose

The PRD sets qualitative success metrics ("3/4 test users say this makes sense"). This document defines the **quantitative offline evaluation protocol** that will be used to iterate on the clustering and recommendation algorithms before any user-facing demo.

## 2. Hold-Out User Split Methodology

### 2.1 Split Ratio

- **Training set:** 80% of synthetic users (80 users)
- **Test set:** 20% of synthetic users (20 users)

### 2.2 Split Constraints

- Stratified by persona: each of the ≥4 personas must be represented in both splits proportionally.
- Deterministic split: seeded PRNG (`random.Random(42)`) so results are reproducible across runs.
- Context-independent split: a user is either in train or test; all their contexts move together.

### 2.3 Procedure

1. Generate 100 synthetic profiles via `scripts/generate_synthetic_data.py --seed 42`.
2. Assign persona labels deterministically at generation time.
3. Shuffle user IDs with seed `42`, then take the first 80 as train and last 20 as test.
4. Fit HDBSCAN on the train set **per context**.
5. For each test user, assign to the nearest cluster centroid (median list) or label `-1` (noise).

## 3. Target Metrics

### 3.1 Recommendation Quality

| Metric | Formula / Definition | Target | Rationale |
|---|---|---|---|
| **Precision@K** (`K=5`) | `# relevant recs in top-K` / `K` | `≥ 0.25` | Classic IR metric for ranked lists. |
| **Mean Reciprocal Rank (MRR)** | `avg(1 / rank_of_first_relevant)` | `≥ 0.30` | Rewards getting a relevant item early. |
| **nDCG@K** (`K=5`) | DCG@K / ideal DCG@K | `≥ 0.35` | Accounts for graded relevance and position. |

### 3.2 Cluster Coherence (Non-Silhouette)

| Metric | Definition | Target | Rationale |
|---|---|---|---|
| **Visual Sanity Check** | Plot cluster size distribution; expect `≥ 3` clusters with `≥ 5` members each. | Pass | Human-in-the-loop validation. |
| **Dunn Index** (optional) | `min(inter-cluster distance) / max(intra-cluster diameter)` | `> 0.5` if computed | Alternative to silhouette; less sensitive to noise. |
| **Median Intra-Cluster Distance** | Median Kendall-Tau distance between members of the same cluster. | `< 0.4` | Tight clusters = strong taste signal. |

> **Note:** Silhouette analysis is **explicitly forbidden** per `TDD.md` Chapter 9 and `ADR-001_REJECTED_TOOLS.md`.

## 4. Synthetic Ground-Truth Generation

Because there are no real user relevance judgments, ground truth is synthesized from cluster structure:

1. **Venue relevance score:** For a test user `u` in cluster `C`, a venue `v` is considered **relevant** if:
   - `v` appears in the ranked list of at least 2 other members of `C`, AND
   - `v` is not already in `u`'s ranked list.
2. **Relevance grade:**
   - `grade = 3` if `v` is in the top-3 of at least 2 cluster members.
   - `grade = 2` if `v` is in the top-5 of at least 2 cluster members.
   - `grade = 1` if `v` appears anywhere in at least 2 cluster members.
   - `grade = 0` otherwise.

3. **Evaluation query:** For each test user, request `n=10` recommendations in their `default` context with no filters applied.

4. **Scoring:** Compare the returned list against the synthetic relevance grades using Precision@5, MRR, and nDCG@5.

## 5. Automated Evaluation Harness

A future `scripts/evaluate_offline.py` will implement:

```python
def evaluate(
    train_profiles: List[TasteProfile],
    test_profiles: List[TasteProfile],
    context_id: str = "default",
    k: int = 5,
) -> Dict[str, float]:
    """
    Returns:
        {
            "precision_at_k": float,
            "mrr": float,
            "ndcg_at_k": float,
            "n_test_users": int,
            "n_noise_users": int,
        }
    """
```

### 5.1 CI / Local Usage
- The harness is **not** part of the MVP demo runtime.
- It runs as a standalone script: `python scripts/evaluate_offline.py --seed 42 --output results.json`.
- Results are committed to `docs/evaluation_results/` for trend tracking.

## 6. Success Thresholds

| Phase | Precision@5 | MRR | nDCG@5 | Interpretation |
|---|---|---|---|---|
| **Baseline** (random) | ~0.10 | ~0.15 | ~0.15 | No clustering signal. |
| **Target (MVP)** | ≥ 0.25 | ≥ 0.30 | ≥ 0.35 | Clustering provides meaningful lift. |
| **Stretch** | ≥ 0.35 | ≥ 0.40 | ≥ 0.45 | Strong taste signal; demo-ready. |

If the MVP target is not met, iterate on:
- Persona biases in synthetic data (stronger cluster separation).
- Time-decay halflife tuning.
- `min_cluster_size` sensitivity analysis (still within HDBSCAN; no silhouette sweeps).

---

*This document derives authority from `docs/PRD.md` Section 3.2 and `docs/TDD.md` Chapter 3. Any metric change requires PRD amendment.*
