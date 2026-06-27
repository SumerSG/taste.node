# taste.node — Planning-Only Repository Hygiene Policy

| | |
|:---|:---|
| **Status** | **Superseded** — Phase 0 commenced and implementation code is now present in `src/`, `tests/`, and `web/`. |
| **Date** | 2026-06-22 |
| **Scope** | All files in `/home/build/taste.node` and subdirectories |

---

## 1. Repository Purpose

This document was originally a **pure planning environment** policy for the taste.node restaurant recommendation platform. Phase 0 has since commenced, and the repository now contains implementation code in `src/`, `tests/`, `web/`, and `.github/workflows/`. This policy is retained for historical reference only.

## 2. Forbidden Artifacts (Historical — No Longer Enforced)

The following were blocked until Phase 0 formally kicked off. They are now present in the repository:

- **Implementation code:** `*.py`, `*.js`, `*.ts`, `*.sql`, `*.ipynb` — Present in `src/` and `web/src/`.
- **Test code:** `tests/` directory — Present.
- **CI/CD workflows:** `.github/workflows/ci.yml` — Present.
- **Compiled artifacts:** `__pycache__/`, `*.pyc` — Blocked by `.gitignore`; `dist/` is tracked for deployment.
- **Application entry points:** `src/main.py` — Present.

## 3. Permitted Artifacts

- Markdown planning documents (`*.md`)
- Dependency manifests (`pyproject.toml`, `requirements.txt`) — to lock the planned stack (`pytest.ini` config migrated into `pyproject.toml`)
- `.gitignore`
- Environment metadata (`.venv/` is gitignored but may exist locally)
- Script stubs **only** in `scripts/` (once Phase 0 begins)

## 4. Enforcement (Historical)

- ~~`.gitignore` explicitly blocks `src/`, `tests/`, and `.github/workflows/`.~~ `.gitignore` was updated to allow these directories.
- ~~Any PR containing forbidden artifacts will be rejected regardless of content quality.~~ Phase 0 code is merged.
- ~~Once Phase 0 is authorized, all code must live in a **separate development branch** or a **dedicated implementation repository**.~~ Code lives in the `main` branch.

## 5. Rationale

The `docs/PROJECT_AUDIT.md` (2026-06-22) identified that non-compliant source code (`src/`, `tests/`, `.github/workflows/ci.yml`) had polluted the planning repo and created **specification drift** — the committed code violated ratified redlines in `AGENTS.md` and `TDD.md` v0.2. This policy prevents recurrence.

---

*Policy ratified 2026-06-22. Violations must be reported in `docs/planning_audit_and_prompt_report.md` per `AGENTS.md` Dispute Resolution.*
