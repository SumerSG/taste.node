# Project Overview — taste.node

> For full requirements see [`PRD.md`](PRD.md). For technical design see [`TDD.md`](TDD.md). For timeline see [`MILESTONES.md`](MILESTONES.md).

---

## Problem

Most recommendation engines rely on ratings or popularity. taste.node starts from a more personal signal: **a ranked list of a user’s favourite restaurants**. Two people with similar top lists likely share taste. The platform clusters users by this signal and surfaces new venues — while letting them apply **live filters** for what they want right now (location, cuisine, diet, healthiness, etc.).

## Goal

Build a platform that:
1. Lets users create and maintain a **ranked list of their top restaurants/cafes**.
2. Clusters users whose ranked lists are similar.
3. Lets users **apply current-preference filters** (location, cuisine, diet, healthiness, etc.).
4. Recommends new venues from the cluster that match those **live filters**.
5. Explains *why* a recommendation was made (e.g., shared cluster + matched filters).

## Scope

### MVP (6 Weeks)

- [x] Ranked-list input (users order their favourite venues)
- [x] Re-ranking when a new venue is visited
- [ ] Clustering algorithm based on ranked-list similarity
- [ ] Live preference filters (location, cuisine, diet, healthiness)
- [ ] Recommendation engine: cluster match × filter match
- [x] Simple frontend to demonstrate the flow (React 19 + Vite, implemented in `web/`)
- [ ] Explainable recommendations (e.g., “3 people in your taste cluster loved this after visiting [X]”)

### Out of Scope

- Real-time GPS / location tracking (location *filter* is in scope)
- Booking / payment integration
- Native mobile apps
- Production-grade hosting

## Target Users

- Food explorers who want recommendations aligned with their palate, not just popularity.

## Key Questions

1. [RESOLVED] Normalized Kendall Tau distance is the locked similarity metric (TDD v0.2 Chapter 3.1).
2. [RESOLVED] Cluster count is dynamic — HDBSCAN discovers it naturally. No fixed `K`. See `TDD.md` Chapter 3.2.
3. [RESOLVED] Seed-to-real user mapping uses warm-start heuristic (nearest cluster centroid). See `TDD.md` Chapter 3.5.
4. [RESOLVED] Scoring weights are locked: `α=0.5 cluster + β=0.3 filter + γ=0.2 temporal`. See `TDD.md` Chapter 3.3.
5. [RESOLVED] Explanation templates are Jinja2-style, ≤120 characters. See `TDD.md` Chapter 3.4.
6. [RESOLVED] Filter dimensions: location (lat/lng + radius), cuisine, dietary tags, health score, price tier. See `PRD.md` FR-5 and `DATA_CONTRACT.md`.

## Success Metrics

| Metric | Target |
|--------|--------|
| Demo readiness | End-to-end walkthrough in under 5 minutes |
| Recommendation relevance | Qualitative positive feedback from test users |
| Cluster coherence | Qualitative validation or cluster count sanity check (silhouette analysis is prohibited per TDD v0.2 stack lock) |

## Decision Log

| Date | Decision | Rationale | By |
|------|----------|-----------|----|
| [Date] | [e.g., Chose Python / FastAPI backend] | [Reason] | [You / Mentor] |

---

*Last updated: 2026-06-27*
