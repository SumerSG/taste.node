# Security & Trust Boundaries

| | |
|:---|:---|
| **Status** | Planning (MVP Demo-Only) |
| **Date** | 2026-06-22 |
| **Scope** | Demo deployment risks, required middleware, and auth migration path |

---

## 1. Threat Model (MVP)

The MVP is explicitly **not production-grade**. The following threats are acknowledged and mitigated at the demo level only:

| Threat | Risk Level | Demo Mitigation | Production Mitigation |
|---|---|---|---|
| User ID enumeration / profile overwrite | **High** (demo) | Document as known gap; deploy on ephemeral demo instance | OAuth2 or API-key auth + user-scoped authorization |
| API abuse / DoS | **Medium** | Rate-limiting middleware (see §2) | Cloud WAF + stricter rate limits + auth gate |
| CORS abuse (malicious frontend) | **Medium** | Restrict CORS to demo domain | Strict origin whitelist + CSP headers |
| Data pollution (fake profiles) | **Low** (synthetic data only) | Reset demo instance daily | Input validation + reporting + moderation |
| Scraping of demo API | **Low** | No sensitive data exposed | Terms of service + rate limiting |

## 2. Required Middleware Before Public Demo

Before any public URL is shared (e.g., Render, Vercel, ngrok), the following middleware **must** be in place:

### 2.1 Rate Limiting

| Layer | Tool | Config |
|---|---|---|
| Application | `slowapi` (FastAPI extension) | 30 requests / minute per IP; 100 / minute for `/recommendations` |
| Reverse Proxy | nginx `limit_req` | `zone=one:10m rate=50r/m`; burst `nodelay` |

### 2.2 CORS Policy

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://taste-node-demo.render.com"],  # exact demo domain only
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)
```

**Rule:** `allow_origins = ["*"]` is **forbidden** for public demos.

## 3. Authentication Migration Path

### 3.1 Phase 1 (MVP Demo): No Auth
- Localhost or password-protected sharing only.
- `user_id` is a plain string; no ownership verification.

### 3.2 Phase 2 (Soft Launch): API-Key Auth
- Issue per-client API keys via a lightweight admin endpoint.
- Keys stored hashed (bcrypt) in a separate `api_keys` table.
- Require `X-API-Key` header on all mutating endpoints (`POST /users`, `PUT /users/...`).

### 3.3 Phase 3 (Production): OAuth2 + User-Scoped Authorization
- OAuth2 password flow or social login (Google, Apple).
- JWT access tokens with `sub` = internal `user_id`.
- Authorization middleware ensures `sub` matches URL `user_id` on profile-mutation endpoints.

## 4. Data Privacy Boundaries

| Rule | Rationale |
|---|---|
| User identities are **never** exposed in cluster explanations. | Privacy-by-design; clusters are anonymous. |
| `visited_at` is used for temporal scoring but **not** surfaced in API responses. | Prevents timeline reconstruction by third parties. |
| Synthetic seed data contains **no real venue names or addresses**. | Legal safety; avoid trademark or privacy issues. |
| Production venue data is sourced only from public APIs with attribution. | `AGENTS.md` Pillar 4 compliance. |

## 5. Deployment Checklist

Before sharing a demo URL:

- [ ] `slowapi` or nginx rate limiting is active.
- [ ] CORS `allow_origins` is restricted to the demo domain.
- [ ] Server error responses do **not** leak stack traces or SQL queries.
- [ ] Demo instance is scheduled to reset daily (truncate `users`, `contexts`, `ranked_items` tables).
- [ ] README Known Security Gaps section is up to date.

---

*This document is subordinate to `docs/AGENTS.md` and `docs/TDD.md`. Auth implementation details belong in `TDD.md` Chapter 4 once Phase 2 begins.*
