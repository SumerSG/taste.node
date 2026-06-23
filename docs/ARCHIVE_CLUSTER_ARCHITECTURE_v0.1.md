# ARCHIVE — Cluster Architecture Planning Document v0.1

| | |
|:---|:---|
| **Status** | **SUPERSEDED — DO NOT IMPLEMENT** |
| **Superseded Date** | 2026-06-22 |
| **Replacement Authority** | `docs/AGENTS.md` + `docs/TDD.md` v0.2 |

## Notice

This document has been **truncated and archived** following the `docs/PROJECT_AUDIT.md` P0 recommendation. It previously contained contradictory algorithms and tools (RBO, Agglomerative Hierarchical Clustering, Spectral Clustering, scikit-learn clustering modules) that are **formally rejected** by the ratified architecture.

## Locked Decisions (Authoritative)

- **Similarity:** Normalized Kendall Tau distance — `docs/TDD.md` Chapter 3.1
- **Clustering:** HDBSCAN (`metric='precomputed'`, `min_cluster_size=5`, `allow_single_cluster=False`) — `docs/TDD.md` Chapter 3.2
- **Scoring:** `α=0.5 cluster_affinity + β=0.3 filter_match + γ=0.2 temporal_boost` — `docs/TDD.md` Chapter 3.3
- **Rejected Tools:** See `docs/ADR-001_REJECTED_TOOLS.md`

## Do Not Use

Do not feed this file to AI coding agents or new team members as a primary reference. If any content herein contradicts `AGENTS.md` or `TDD.md` v0.2, those documents win per the dispute resolution clause in `AGENTS.md`.
