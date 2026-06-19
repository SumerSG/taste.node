# Milestones & Timeline — taste.node

| | |
|:---|:---|
| **Duration** | 6 weeks |
| **Start** | [Fill in] |
| **End** | [Fill in] |
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
| Thu | Identify scraping source; check ToS / API docs | Seed data source documented in TDD |
| Fri | Write scraper skeleton; test one user profile | Scraper outputs one valid JSON object |

**Week 1 Exit Criteria:**
- [ ] Mentors have reviewed and approved PRD + TDD.
- [ ] Repo has working dev environment (lint, run, test commands).
- [ ] Seed data source is confirmed legal/feasible.

---

### Week 2 — First Demo Sprint

**Theme:** Prove the core hypothesis fast.

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Implement ranked-list data model and similarity function | Two test users have a similarity score |
| Tue | Implement seed data ingestion + initial K-Means clustering | Clusters generated from seed data |
| Wed | Build minimal frontend: input ranked list, see cluster | UI loads in browser |
| Thu | Wire frontend → API → clustering → recs (no filters yet) | Full flow: list input → rec output |
| Fri | Polish, rehearse demo, fix bugs | Demo script written; dry-run completed |

**Week 2 Exit Criteria:**
- [ ] Demo can be walked through in < 5 minutes with real seed data.
- [ ] A user can input a ranked list and get a cluster label.
- [ ] Cluster generates at least one recommendation.
- [ ] No crashes on the happy path.

---

### Week 3 — Live Filters & Explanations

**Theme:** Make it useful, not just clever.

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Design and implement filter schema (location, cuisine, diet, health, price) | Filters defined in API |
| Tue | Build UI for filter controls | Filter panel renders |
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
| Thu | UI polish: responsive layout, loading states, error handling | Passes visual sanity check |
| Fri | Bug bash + performance check | P0 bugs fixed; no obvious slowness |

**Week 4 Exit Criteria:**
- [ ] A brand-new user can onboard and get relevant recommendations within 2 minutes.
- [ ] Seed clusters and real-user clusters coexist or replace cleanly.
- [ ] UI is demo-safe: readable, no layout breaks.

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
| Frontend is too complex | Pivot to Streamlit for Weeks 2–4; rebuild in React only if time permits |
| Filters return empty results too often | Relax filter logic; show "closest match" with explanation |

---

*Last updated: 2026-06-19*
