# Milestones & Timeline — taste.node

| | |
|:---|:---|
| **Duration** | 6 weeks |
| **Start** | 2026-06-23 |
| **End** | 2026-08-04 |
| **Review cycle** | Weekly mentor sync + async Slack |

---

## Summary

| Milestone | Date | Deliverable |
|-----------|------|-------------|
| **M0: Alignment** | End of Week 1 | Locked PRD, TDD, and tech stack. Seed data source identified. |
| **M1: First Demo** | End of Week 2 | Working prototype: seed clusters + ranked list input + basic recs. |
| **M2: Core Build** | End of Week 4 | Full pipeline: user onboarding, live filters, explanation engine, real user clusters. |
| **M3: Final Demo** | End of Week 6 | Polished UI, stable demo flow, documentation, retrospective. |

---

## Week-by-Week Plan

### Week 1 — Alignment & Setup

**Theme:** Decide what to build and how.

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Kickoff with mentors; clarify scope and expectations | Meeting notes logged |
| Tue | Finalise PRD (this doc) and TDD | PRD v0.2, TDD v0.2 in repo |
| Wed | Lock tech stack; init project scaffolding | `src/` has runnable "hello world" |
| Thu | Design synthetic data generator schema; persona taxonomy | Synthetic data schema documented in TDD |
| Fri | Implement seed generator; test one profile output | Generator outputs one valid JSON object |

**Week 1 Exit Criteria:**
- [ ] Mentors have reviewed and approved PRD + TDD.
- [ ] Repo has working dev environment (lint, run, test commands).
- [ ] Seed data generator is deterministic and reproducible.

---

### Week 2 — First Demo Sprint

**Theme:** Prove the core hypothesis fast.

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Implement ranked-list data model and similarity function | Two test users have a similarity score |
| Tue | Implement seed data ingestion + initial HDBSCAN clustering (context-aware) | Clusters generated from seed data |
| Wed | Validate DATA_CONTRACT.md against API spec; scaffold API-layer test plan in `docs/TDD.md` Phase 5 | Contract validated; test plan documented (not yet implemented) |
| Thu | End-to-end API integration test via curl: onboarding → similarity → clustering → recommendations | Full backend flow validated without UI |
| Fri | Polish, rehearse demo, fix bugs | Demo script written; dry-run completed |

**Week 2 Exit Criteria:**
- [ ] Demo can be walked through in < 5 minutes with real seed data.
- [ ] A user can input a ranked list and get a cluster label **within a specific context_id**.
- [ ] Cluster generates at least one recommendation **for the requested context**.
- [ ] No crashes on the happy path.

---

### Week 3 — Live Filters & Explanations

**Theme:** Make it useful, not just clever.

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Design and implement filter schema (location, cuisine, diet, health, price) | Filters defined in API |
| Tue | Implement filter parameter parsing and validation in `/recommendations` endpoint | Filter params accepted and validated |
| Wed | Implement recommendation engine: cluster affinity × filter match | Scoring function returns ranked results |
| Thu | Add explanation generation (template-based) | Every rec has a sentence |
| Fri | Integrate filter + explanation into demo flow | Updated demo walkthrough |

**Week 3 Exit Criteria:**
- [ ] Filters visibly change recommendations.
- [ ] Explanations are grammatically correct and meaningful.
- [ ] Latency from filter change → new recs < 1s.

---

### Week 4 — Real User Clusters & Polish

**Theme:** Transition from seed to real data.

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Implement user onboarding (create profile, input list) | New user can join without seed data collision |
| Tue | Implement incremental cluster update (new user joins → cluster adjusts) | Cluster membership updates on new user |
| Wed | Add "re-rank on new visit" flow | User can insert a visited venue into their list |
| Thu | API polish: standardized `ErrorResponse` schema, edge-case handling, performance check | Passes Postman/curl sanity check |
| Fri | Bug bash + performance check | P0 bugs fixed; no obvious slowness |

**Week 4 Exit Criteria:**
- [ ] A brand-new user can onboard and get relevant recommendations within 2 minutes.
- [ ] Seed clusters and real-user clusters coexist or replace cleanly.
- [ ] API is demo-safe: curl commands run without errors, JSON output is readable, and error responses conform to `ErrorResponse` schema.

---

### Week 5 — Edge Cases & Testing

**Theme:** Harden before demo day.

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Handle short-list cold start (< 3 venues) | Graceful fallback or less confident recs |
| Tue | Handle zero-filter-result fallback | Relaxes filters with explanation |
| Wed | Validate cluster quality on held-out seed data | Coherence metric recorded |
| Thu | End-to-end tests (happy path + 2 edge cases) | CI passes |
| Fri | Documentation sweep: README, API docs, setup guide | Docs are complete for handover |

**Week 5 Exit Criteria:**
- [ ] Demo has a clear "Plan B" for every risky step.
- [ ] Cluster quality is backed by a metric or visual validation.
- [ ] Repo README explains how to run the project in < 5 minutes.

---

### Week 6 — Final Demo & Wrap-Up

**Theme:** Ship the story, not just the code.

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Final demo script + slides (if needed) | Script rehearsed once out loud |
| Tue | Stress-test demo environment; fix last bugs | Stable build URL or local run confirmed |
| Wed | Dry-run with a neutral friend or mentor | Feedback incorporated |
| Thu | **Final Demo** | Delivered to mentors + stakeholders |
| Fri | Retrospective write-up; update docs; handover notes | Retrospective in repo; project archived |

**Week 6 Exit Criteria:**
- [ ] Final demo completed on time.
- [ ] Retrospective covers: what worked, what didn’t, what was learned.
- [ ] Repo is in a state where someone else could pick it up in 6 months.

---

## Buffer & Contingency

| If this slips... | Then... |
|------------------|---------|
| Seed data is blocked by ToS | Switch to synthetic dataset (generate fake user profiles with realistic rankings) |
| Clustering is too slow | Reduce seed set to 200 users; pre-compute similarities |
| Frontend is too complex | Defer to Phase 6 per TDD Redline 5; use curl-based demo fallback |
| Filters return empty results too often | Relax filter logic; show "closest match" with explanation |

---

*Last updated: 2026-06-22*

## New & Updated Documents

The following planning documents were created or updated as part of the 2026-06-22 audit closure:
- `docs/ADR-001_REJECTED_TOOLS.md` — formal rejection of mismatched algorithms and tools
- `docs/VENUE_INGESTION_PIPELINE.md` — public API ingestion contract and normalization rules
- `docs/EVALUATION_PLAN.md` — offline quantitative evaluation protocol
- `docs/SECURITY_BOUNDARIES.md` — demo-only security and auth migration path
- `PLANNING_HYGIENE.md` — repository-wide policy forbidding implementation code until Phase 0
