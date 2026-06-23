# taste.node — Planning-Only Repository Hygiene Policy

| | |
|:---|:---|
| **Status** | Enforced |
| **Date** | 2026-06-22 |
| **Scope** | All files in `/home/build/taste.node` and subdirectories |

---

## 1. Repository Purpose

This repository is a **pure planning environment** for the taste.node restaurant recommendation platform. It contains architectural constraints, technical designs, product requirements, data contracts, and demo scripts. It **does not contain runnable application code**.

## 2. Forbidden Artifacts

The following file types and directories **shall not be committed** until Phase 0 code consolidation is formally kicked off:

- **Implementation code:** `*.py`, `*.js`, `*.ts`, `*.sql`, `*.ipynb`
- **Test code:** `tests/` directory or `test_*.py` files
- **CI/CD workflows:** `.github/workflows/*.yml`, `.github/workflows/*.yaml`
- **Compiled artifacts:** `__pycache__/`, `*.pyc`, `dist/`, `build/`
- **Application entry points:** `src/main.py`, `src/app.py`, or equivalent

## 3. Permitted Artifacts

- Markdown planning documents (`*.md`)
- Dependency manifests (`pyproject.toml`, `requirements.txt`, `pytest.ini`) — to lock the planned stack
- `.gitignore`
- Environment metadata (`.venv/` is gitignored but may exist locally)
- Script stubs **only** in `scripts/` (once Phase 0 begins)

## 4. Enforcement

- `.gitignore` explicitly blocks `src/`, `tests/`, and `.github/workflows/`.
- Any PR containing forbidden artifacts will be rejected regardless of content quality.
- Once Phase 0 is authorized, all code must live in a **separate development branch** or a **dedicated implementation repository**.

## 5. Rationale

The `docs/PROJECT_AUDIT.md` (2026-06-22) identified that non-compliant source code (`src/`, `tests/`, `.github/workflows/ci.yml`) had polluted the planning repo and created **specification drift** — the committed code violated ratified redlines in `AGENTS.md` and `TDD.md` v0.2. This policy prevents recurrence.

---

*Policy ratified 2026-06-22. Violations must be reported in `docs/planning_audit_and_prompt_report.md` per `AGENTS.md` Dispute Resolution.*
