# taste.node

> Restaurant and cafe recommendation platform powered by taste-based AI clustering.

## Overview

taste.node lets users build a **ranked list of their top restaurants and cafes** — any new place they visit can be slotted into the list. The platform clusters users with similar ranked lists, then recommends new venues based on those clusters. Users can also **filter recommendations by current preferences** like location, cuisine, dietary style (meat / fish / vegetarian), healthiness, and more.

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

See [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) for the full brief.

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
