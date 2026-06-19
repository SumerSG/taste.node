# Project Overview — taste.node

---

## Problem

Generic restaurant reviews and location-based search miss a key signal: **what people actually like**. taste.node explores whether clustering users by taste leads to better, more personal recommendations.

## Goal

Build a platform that:
1. Profiles a user’s taste from ratings, preferences, and behavior.
2. Clusters users with similar taste profiles.
3. Recommends restaurants and cafes based on cluster affinity.
4. Explains *why* a recommendation was made.

## Scope

### MVP (6 Weeks)

- [ ] User taste profiling input
- [ ] Clustering algorithm for taste profiles
- [ ] Basic recommendation engine
- [ ] Simple frontend to demonstrate the flow
- [ ] Explainable recommendations (e.g., “Because people with your taste loved this”)

### Out of Scope

- Real-time location tracking
- Booking / payment integration
- Native mobile apps
- Production-grade hosting

## Target Users

- Food explorers who want recommendations aligned with their palate, not just popularity.

## Key Questions

1. What features define “taste”?
2. How many clusters? Fixed or dynamic?
3. How do we handle new users (cold-start)?
4. How do we measure recommendation quality?
5. How do we explain cluster membership and suggestions?

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

*Last updated: [Date]*
