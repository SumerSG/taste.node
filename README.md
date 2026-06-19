# taste.node

> Restaurant and cafe recommendation platform powered by taste-based AI clustering.

## Overview

taste.node lets users build a **ranked list of their top restaurants and cafes** — any new place they visit can be slotted into the list. The platform clusters users with similar ranked lists, then recommends new venues based on those clusters. Users can also **filter recommendations by current preferences** like location, cuisine, dietary style (meat / fish / vegetarian), healthiness, and more.

To bootstrap the platform before real users join, taste.node first builds **estimated clusters from scraped public rating data** (e.g., user reviews and favourites from open restaurant platforms). These seed clusters provide an initial recommendation layer that grows more accurate as real users onboard and contribute their own ranked lists.

Built during a 6-week internship focused on AI tools.

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd taste.node

# Setup (stack TBD)
# [Installation instructions once tooling is decided]

# Run
# [Run commands once project structure is in place]
```

## Project Details

| Document | What it covers |
|----------|----------------|
| [`docs/PRD.md`](docs/PRD.md) | Product requirements, user personas, feature specs |
| [`docs/TDD.md`](docs/TDD.md) | Technical design, algorithms, API draft, stack |
| [`docs/MILESTONES.md`](docs/MILESTONES.md) | 6-week timeline, weekly deliverables, exit criteria |
| [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | One-page summary of the entire project |

## Architecture

```
[User Ranked List] → [Taste Similarity Model] → [Cluster Assignment]
    → [Live Filters: Location, Cuisine, Diet, Health] → [Recommendation Engine] → [Venue Suggestion]
```

## Milestones

- **Week 2:** First demo (prototype clustering + basic recommendations)
- **Week 6:** Final demo (polished platform with UI and explainable recommendations)

## Tech Stack

| Layer | Choice | Status |
|-------|--------|--------|
| Frontend | TBD | 🟡 Pending |
| Backend | TBD | 🟡 Pending |
| ML / Clustering | TBD | 🟡 Pending |
| Database | TBD | 🟡 Pending |
| Deployment | TBD | 🟡 Pending |

## Project Structure

```
taste.node/
├── docs/              # Project documentation
├── src/               # Application source code
├── tests/             # Test suite
├── .github/           # CI/CD workflows
└── README.md          # This file
```

## License

[To be decided]
