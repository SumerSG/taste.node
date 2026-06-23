# ADR-001: Formal Rejection of Mismatched Tools & Algorithms

| | |
|:---|:---|
| **Status** | Ratified |
| **Date** | 2026-06-22 |
| **Authority** | `docs/AGENTS.md` — Pillar 1, Pillar 4 |
| **Scope** | All clustering, similarity, ingestion, and persistence tooling for taste.node MVP (Phases 1–5) |

---

## 1. Context

taste.node operates in a **non-Euclidean, rank-based distance space** defined by normalized Kendall Tau distance on contextual ranked lists. Standard ML and data-science tools designed for Euclidean embeddings, text vectors, or spherical Gaussian clusters are **architecturally mismatched** for this domain. Without an explicit rejection record, future architecture reviews or coding agents may inadvertently reintroduce these tools.

## 2. Rejected Algorithms

### 2.1 Clustering Algorithms (Euclidean-Only)

| Algorithm | Reason for Rejection |
|---|---|
| **K-Means** (`sklearn.cluster.KMeans`) | Assumes spherical clusters with equal variance in Euclidean space. Taste clusters are non-spherical and density-varying. |
| **Agglomerative Hierarchical Clustering (AHC)** (`sklearn.cluster.AgglomerativeClustering`) | Permitted only as a future research reference; **rejected as primary algorithm**. Produces dendrograms that imply nested structure not present in taste data, and silhouette-based cutoff tuning is forbidden. |
| **Spectral Clustering** (`sklearn.cluster.SpectralClustering`) | Assists only when clusters are non-convex in Euclidean space; irrelevant because our space is defined by Kendall Tau distance, not Euclidean embeddings. |
| **DBSCAN (primary)** (`sklearn.cluster.DBSCAN`) | HDBSCAN is its strict superset for our use case (precomputed metric, variable density, hierarchy). DBSCAN may be referenced for educational contrast but is **locked out as primary**. |

**Locked Replacement:** `hdbscan.HDBSCAN(metric='precomputed', min_cluster_size=5, allow_single_cluster=False)` — `docs/TDD.md` Chapter 3.2.

### 2.2 Evaluation Methods (Forbidden by Stack Lock)

| Method | Reason for Rejection |
|---|---|
| **Silhouette analysis** (`sklearn.metrics.silhouette_score`) | Explicitly forbidden in `TDD.md` Chapter 9. HDBSCAN does not require a preset `K`; silhouette sweeps would force an artificial cluster-count prescription. |
| **Elbow method** | Assumes Euclidean variance minimization. Incompatible with density-based clustering on precomputed Kendall Tau matrices. |

**Accepted Alternatives:** Visual sanity checks, cluster count validation, Precision@K, MRR, nDCG — see `docs/EVALUATION_PLAN.md`.

## 3. Rejected Infrastructure & Storage

### 3.1 Vector Databases

| Tool | Reason for Rejection |
|---|---|
| **Pinecone** | Designed for high-dimensional Euclidean/cosine embeddings. Our distance metric is Kendall Tau on ranked lists; there is no vector embedding to index. |
| **Weaviate** | Same mismatch: assumes vector-search semantics (nearText, nearVector) that do not map to rank-correlation distances. |
| **pgvector** | PostgreSQL extension for vector similarity search. Useful for Euclidean/IVFFlat/HNSW embeddings; irrelevant for precomputed Kendall Tau matrices. |

**Rationale:** A vector DB is architecturally mismatched because the distance space is defined by pairwise rank correlation, not by embedding vectors in ℝⁿ. For >10K users, future approximate-nearest-neighbor search will operate on precomputed distance matrices via `faiss-cpu` or `hnswlib`, not on raw embeddings.

### 3.2 Scraping Tools

| Tool | Reason for Rejection |
|---|---|
| **BeautifulSoup** | HTML parsing for web scraping. Production data must come only through documented public APIs (Yelp Fusion, Google Places) per `AGENTS.md` Pillar 4. |
| **Scrapy** | Large-scale scraping framework. Same legal/policy reason as above. |

**Locked Path:** Synthetic dataset for Phase 1; public APIs with attribution for Phase 2.

### 3.3 Scikit-Learn Clustering Modules

| Module | Reason for Rejection |
|---|---|
| `sklearn.cluster` (all clustering classes) | Entire module rejected for clustering logic. `sklearn` utilities for model persistence (`joblib`) or preprocessing (non-clustering) are acceptable only if explicitly justified. |
| `sklearn.metrics.silhouette_score` | See §2.2. |

## 4. Rejected Data-Science Libraries (for MVP)

| Library | Reason for Rejection |
|---|---|
| **pandas** | Not in locked dependency manifest. Adds significant memory overhead for MVP data sizes (≤1,000 users). Pure Python + NumPy + SQLAlchemy Core is sufficient. |
| **rank-bm25** | RBO implementation library. RBO is superseded by locked Kendall Tau distance; no need for alternative rank metrics. |
| **sentence-transformers** | Neural text embeddings for venue descriptions. Out of scope for MVP; recommendation engine operates on ranked-list overlap, not semantic venue similarity. |

## 5. Decision Record

| Tool / Algorithm | Verdict | Replacement | Authority |
|---|---|---|---|
| K-Means | ❌ Rejected | HDBSCAN | `AGENTS.md` Pillar 1 |
| AHC (primary) | ❌ Rejected | HDBSCAN | `AGENTS.md` Pillar 1 |
| Spectral Clustering | ❌ Rejected | HDBSCAN | `AGENTS.md` Pillar 1 |
| DBSCAN (primary) | ❌ Rejected | HDBSCAN | `AGENTS.md` Pillar 1 |
| Silhouette / Elbow | ❌ Forbidden | Visual sanity, Precision@K | `TDD.md` Chapter 9 |
| Vector DBs (Pinecone, Weaviate, pgvector) | ❌ Rejected | None for MVP; ANN libraries for future | This ADR |
| Scraping tools (BeautifulSoup, Scrapy) | ❌ Rejected | Public APIs only | `AGENTS.md` Pillar 4 |
| Scikit-learn clustering | ❌ Rejected | hdbscan library | This ADR |
| pandas | ❌ Deferred | NumPy + Python loops | This ADR |
| rank-bm25 | ❌ Rejected | SciPy `kendalltau` | This ADR |
| sentence-transformers | ❌ Rejected | None for MVP | This ADR |

---

*This ADR is referenced by `docs/AGENTS.md` and `docs/TDD.md` v0.2. Any future tool adoption not listed in the locked dependency manifest (`pyproject.toml`) requires an amendment to this ADR or a new ADR with explicit architectural justification.*
