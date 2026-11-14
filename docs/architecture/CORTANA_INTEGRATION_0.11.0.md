# CORTANA Integration 0.11.0

**Status:** Architecture baseline accepted; runtime integration is staged behind the milestones below.  
**Repository:** erykjuraszczyk-ui/Core  
**Baseline:** main at e0c6ad06b8097afd5a22f1bd9f49509eb1b6bb8e

## 1. Goal

Make CORTANA Core the stable integration boundary for the browser application, Android application, Cortana World and the Python SOUL CORE. Consolidate security, model access, consent and cloud memory ownership without merging unrelated repositories or introducing distributed services prematurely.

## 2. Current implementation facts

- Core uses Cloudflare Pages Functions, D1 and optional Vectorize.
- memory_entries and memory_spaces live in D1. The project README explicitly defines D1 as authoritative.
- Vector retrieval returns candidate IDs; Core resolves those IDs in D1 and scopes them to the requesting memory space.
- Memory is explicitly opted into and manually managed. Chat transcripts are not automatically persisted.
- The memory capability is a long-lived bearer secret. It is not an account identity, has no demonstrated expiry/rotation/revocation flow, and must not be treated as a production native-client login.
- SOUL CORE has a Python worker/outbox lifecycle and local persistence adapters. Its current outbox and authoritative store are not one distributed transaction; reconciliation is required.
- Current public routes are legacy unversioned paths: /api/chat, /api/memory and /api/health.

## 3. Target architecture

Browser UI + Android app + Cortana World
                 |
          HTTPS / JSON / SSE
                 |
          CORTANA CORE API v1
                 |
        +--------+---------+
        |        |         |
    Agent App  Memory App  Identity/Session
     Service   Service     (next milestone)
        |        |
   Model Port  Memory Port <--- SOUL CORE adapter
        |        |               (Python domain logic,
 Provider API   D1                worker and lifecycle)
                 |
        transactional outbox
                 |
           Vectorize index
          (derived projection only)

The diagram is a logical boundary, not a commitment to separate microservices. For this release Core remains a Cloudflare Pages modular monolith.

## 4. Component ownership

| Component | Owns | Must not own |
|---|---|---|
| Core API | Versioned contract, request validation, authorization, rate limits, provider routing | Client UI state or local model-provider secrets |
| Agent application service | Prompt assembly, model-provider adapter, streaming response policy | Persistent chat transcripts by default |
| Memory application service | Consent checks, memory lifecycle, canonical reads/writes, deletion | A second cloud source of truth |
| D1 | Canonical cloud memory records and metadata | Semantic nearest-neighbour ranking |
| Vectorize | Rebuildable retrieval projection | Unique memory content or sole copy of a record |
| SOUL CORE | Identity/affect/reflection domain logic, worker lifecycle and adapter-neutral memory orchestration | Direct browser access or competing cloud writes |
| Android / World / Browser | Presentation, explicit user interaction, local ephemeral state | Provider credentials or direct D1/Vectorize access |

## 5. API boundary

The first versioned contract is defined in OpenAPI v1.

- New endpoints live under /api/v1.
- Existing routes remain supported during migration; they are compatibility adapters, not separate business logic.
- Chat uses Server-Sent Events and never persists transcripts automatically.
- Mutating requests accept an idempotency key before retries are enabled on clients.
- New errors use a stable machine-readable code, safe message and request ID.
- All responses containing user memory use Cache-Control: no-store.
- Clients cannot choose a model-provider URL, model secret, system prompt or arbitrary tool call.

## 6. Memory consistency contract

1. D1 is the source of truth for cloud-connected profiles.
2. A memory mutation writes the canonical record and an index-projection job to the same durable database transaction boundary. The exact D1 batch/transaction semantics must be verified in the implementation PR before relying on atomicity.
3. A worker projects committed records to Vectorize with bounded retry and idempotent upsert semantics.
4. Retrieval treats Vectorize results only as candidate IDs. Core reloads the payload from D1 and checks the memory-space ownership before prompt assembly.
5. Delete first makes the D1 record unavailable. Vector cleanup is retryable housekeeping; stale vector entries must never restore deleted content.
6. Startup/periodic reconciliation compares canonical D1 records with projection state and repairs missing or stale vectors.
7. SOUL CORE consumes the Core memory port in connected mode. Local SQLite/Qdrant remain valid only for a separate local-only profile until sync semantics are designed.

## 7. Identity and security boundary

The current memory token is a bearer capability, not an authenticated user session. It is acceptable only as the existing first-party memory-space capability under the current documented limitations. It must not be exposed in URLs, logs, analytics, crash reports or source control.

Before Android or Cortana World receive cross-device memory access, implement and review:
- an explicit account/session mechanism;
- short-lived access credentials and refresh/revocation semantics;
- per-user and per-device authorization;
- durable abuse controls and rate limiting;
- explicit consent for memory access and synchronization;
- auditable export and deletion behaviour.

Do not ship a long-lived memory capability as a substitute for login. Do not enable bidirectional local/cloud sync until conflict ownership and resolution rules are approved.

## 8. Compatibility and migration

- Keep /api/chat, /api/memory and /api/health operational while v1 routes are introduced.
- Route legacy and v1 handlers to shared application services; do not copy business logic.
- Add contract tests before switching any client.
- Switch one client at a time behind a configuration flag.
- Remove legacy paths only in a separately announced breaking release after telemetry confirms no remaining callers.

## 9. Release acceptance criteria

- OpenAPI v1 contract is checked in and reviewed.
- Legacy route behaviour is covered by regression tests.
- Versioned route contract tests cover success, validation, authentication, origin, rate-limit and provider-failure paths.
- D1 remains authoritative if Vectorize or the embedding provider is unavailable.
- Memory deletion is effective even when vector cleanup is delayed.
- SOUL CORE adapter contract tests pass without a live Qdrant service.
- Android and Cortana World are not granted cross-device memory access before session security is complete.
- CI passes unit tests, typecheck and production build.

## 10. Non-goals

- No claim of machine consciousness or human-like memory.
- No automatic ingestion of chat transcripts, microphone audio or camera media.
- No autonomous production-code modification, commit, merge or deployment.
- No replacement of Windows-Hybrid or Hybrid-OS-X kernel projects.
- No bidirectional sync across independently authoritative stores in this milestone.
