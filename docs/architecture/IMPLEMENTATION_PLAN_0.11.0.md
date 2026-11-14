# CORTANA Integration 0.11.0 — Implementation Plan

## Accepted decision

- [ADR-001: Core as the integration hub](ADR-001-core-integration-hub.md)
- Contract: [OpenAPI v1](../api/openapi-v1.yaml)
- Cloud memory authority: D1. Vectorize is a derived index; SOUL CORE is integrated through a port/adapter.

## Milestones

### M0 — Architecture and API contract (this PR)

**Outcome:** one reviewable integration baseline before changing runtime behaviour.

**Scope:**
- document component ownership and service boundaries;
- define versioned HTTP and streaming contracts in OpenAPI;
- record D1 as cloud memory authority;
- identify the authentication blocker for native clients.

**Verification:**
- links and endpoint names agree between architecture and OpenAPI files;
- legacy API paths are explicitly retained for compatibility;
- no runtime code or production data is changed.

### M1 — Versioned Core API adapters

**Outcome:** introduce /api/v1/health, /api/v1/chat and /api/v1/memory/* while preserving the existing routes.

**Scope:**
- extract shared application services from current Pages Function handlers;
- add request/response schemas and stable error codes;
- preserve SSE streaming semantics;
- add contract and legacy-regression tests.

**Verification:** test each endpoint for valid input, malformed JSON, oversize body, rejected origin, missing configuration, provider 429/5xx and abort/disconnect behaviour.

### M2 — Identity and session boundary

**Outcome:** secure multi-device access before native memory integration.

**Scope:**
- choose an authentication/session provider (open question Q-001);
- implement short-lived credentials, refresh, revocation and per-device authorization;
- add durable rate limiting and audit-safe request IDs;
- keep the existing memory capability isolated as a compatibility mechanism.

**Verification:** token expiry/revocation tests, unauthorized cross-space access tests, abuse-limit tests and secret-leak checks.

### M3 — Memory repository and projection worker

**Outcome:** make the canonical write path reliable and recoverable.

**Scope:**
- define a TypeScript MemoryRepository port and a D1 adapter;
- record projection jobs transactionally with canonical memory mutations;
- implement idempotent Vectorize upsert/delete, bounded retry and dead-letter visibility;
- add reconciliation from D1 to Vectorize;
- preserve D1 ownership checks during retrieval.

**Verification:** failure injection for embedding timeout, Vectorize outage, duplicate delivery, partial deletion, worker restart and reconciliation.

### M4 — SOUL CORE adapter

**Outcome:** reuse Python SOUL CORE lifecycle/domain logic without coupling Core to a second cloud database.

**Scope:**
- define a narrow CoreMemoryPort interface and Python HTTP adapter;
- map SOUL CORE approved memory events to versioned API operations;
- preserve its standalone local SQLite/Qdrant mode separately;
- use idempotency keys and explicit event IDs for retries.

**Verification:** Python contract tests against a fake Core API, duplicate-event tests, timeout/retry tests and no-Qdrant integration tests.

### M5 — Client adoption

**Outcome:** connect clients one by one to the same Core API.

**Order:**
1. Browser client switches to v1 with legacy fallback.
2. Cortana World switches chat to v1.
3. Android uses session auth and v1 only after M2 security acceptance.

**Verification:** per-client smoke tests, stream cancellation, token expiry, consent disabled/enabled, deletion and degraded-network behaviour.

### M6 — Release hardening

**Outcome:** integration release candidate.

**Scope:** operational metrics, migration/rollback notes, security review, dependency inventory, deployment checklist and user-facing privacy controls.

**Verification:** all CI gates pass; restore/reconciliation exercise passes; no provider secret appears in client bundles or logs.

## Cross-cutting constraints

- Core remains a modular monolith on Cloudflare Pages for this release.
- D1 is the sole cloud authority for connected memory records.
- Vectorize and other search engines are rebuildable projections.
- No client connects directly to provider APIs, D1 or Vectorize.
- Memory is opt-in, manually manageable, exportable and deletable.
- Do not persist chat transcripts or raw sensory data without a separate explicit consent design.
- Retry only idempotent operations; mutations without an idempotency key must not be blindly retried.
- Never treat a passing static preflight or unit test as proof of sandbox security.

## Explicit non-goals

- No merge to main as part of M0.
- No production deployment or Cloudflare secret changes.
- No Android release build or application-store submission.
- No automatic code-generation/commit/merge privileges for the agent.
- No local/cloud bidirectional sync before conflict rules are approved.

## Unresolved question

- **Q-001 — Authentication/session provider:** Which account/session system should issue short-lived credentials for Android and Cortana World? This blocks M2 and native cross-device memory access; it does not block M0 or the browser-facing contract.
