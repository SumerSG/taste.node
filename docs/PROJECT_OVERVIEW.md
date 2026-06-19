# Project Overview — taste.node

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

- [ ] Ranked-list input (users order their favourite venues)
- [ ] Re-ranking when a new venue is visited
- [ ] Clustering algorithm based on ranked-list similarity
- [ ] Live preference filters (location, cuisine, diet, healthiness)
- [ ] Recommendation engine: cluster match × filter match
- [ ] Simple frontend to demonstrate the flow
- [ ] Explainable recommendations (e.g., “3 people in your taste cluster loved this after visiting [X]”)

### Out of Scope

- Real-time GPS / location tracking (location *filter* is in scope)
- Booking / payment integration
- Native mobile apps
- Production-grade hosting

## Target Users

- Food explorers who want recommendations aligned with their palate, not just popularity.

## Key Questions

1. What similarity metric best compares ranked restaurant lists? (Kendall tau, Spearman, Jaccard, embedding-based?)
2. How many clusters, and should the number be fixed or dynamic?
3. How do initial seed clusters from scraped data translate into recommendations for the first real users?
4. How do we weight cluster similarity vs. live-filter match?
5. How do we explain a recommendation in one sentence?
6. What filter dimensions do users actually care about (location, cuisine, diet, health, price, etc.)?

## Success Metrics

| Metric | Target |
|--------|--------|
| Demo readiness | End-to-end walkthrough in under 5 minutes |
| Recommendation relevance | Qualitative positive feedback from test users |
| Cluster coherence | Silhouette score > 0.5 or qualitative validation |

## Decision Log

| Date | Decision | Rationale | By |
|------|----------|-----------|----|
| [Date] | [e.g., Chose Python / FastAPI backend] | [Reason] | [You / Mentor] |

---

*Last updated: 2026-06-19*
