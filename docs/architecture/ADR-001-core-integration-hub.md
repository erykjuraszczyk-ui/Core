# ADR-001: CORTANA Core as the integration hub

- **Status:** Accepted
- **Date:** 2026-11-14
- **Scope:** CORTANA Core, SOUL CORE, browser client, Android client, Cortana World

## Context

CORTANA already has a browser-first Cloudflare implementation. Its documented and implemented memory path stores approved entries in D1 and uses Vectorize as an optional retrieval index. The Python SOUL CORE repository provides reusable identity, reflection, memory lifecycle and worker logic, with local persistence adapters.

Connecting every client directly to independent model and memory stores would duplicate policy, credentials, consent handling and data ownership. Treating D1 and Qdrant as simultaneous authorities for one connected profile would also create ambiguous updates and deletion semantics.

## Decision

Use a **modular Core API with ports and adapters** as the integration boundary.

1. CORTANA Core owns cloud-connected identity/session policy, API contracts, model-provider access, consent enforcement and cloud memory operations.
2. D1 remains the authoritative store for cloud-connected memory records and metadata.
3. Vectorize is a rebuildable search projection. A vector match is never the authoritative memory payload; Core resolves candidate IDs against D1 and verifies the owning memory space before returning content.
4. SOUL CORE contributes domain logic and lifecycle workers through an explicit memory/provider port. It must not independently write a second authoritative store for the same cloud-connected profile.
5. SQLite/Qdrant may remain adapters for a standalone, local-only SOUL CORE deployment. Cross-device replication between local stores and Core is out of scope until a conflict-resolution and ownership protocol is specified.
6. Browser, Android and Cortana World clients use the same versioned Core API. Provider credentials remain server-side.

## Considered options

- **OPT-001 — Central Core API, D1 authority, derived vector index (selected).** One policy and cloud-data boundary; clients remain thin and platform-independent.
- **OPT-002 — Distributed client-owned stores.** Preserves local autonomy but duplicates security and consent rules and makes cross-device consistency harder.
- **OPT-003 — Multiple authoritative stores with bidirectional synchronization.** Offers flexibility but introduces conflict resolution, dual-write failure modes and operational complexity before the product has a defined sync protocol.

## Consequences

### Positive

- One canonical cloud record for each memory entry.
- Vector search can be disabled, rebuilt or replaced without losing approved memory data.
- Clients do not need model-provider credentials or direct database access.
- SOUL CORE remains portable and independently testable behind an adapter boundary.

### Negative

- Core becomes a critical service boundary and needs explicit availability, rate-limit and migration discipline.
- Native clients require a proper session/authentication layer before cross-device memory access; the current long-lived memory capability is not a user identity system.
- Local/offline memory synchronization remains deferred until conflict semantics are defined.

## Validation criteria

- Contract tests prove all clients use the same /api/v1 schemas.
- Memory writes commit to D1 before asynchronous index projection.
- Vector retrieval returns only entries that still exist in D1 and belong to the requesting memory space.
- Deleting a D1 record makes it unavailable even when vector cleanup is delayed or fails.
- SOUL CORE integration tests run against a fake Core memory port without requiring Qdrant.
- No browser or native client build contains a model-provider secret.

## Related documents

- [CORTANA Integration 0.11.0](CORTANA_INTEGRATION_0.11.0.md)
- [Implementation plan 0.11.0](IMPLEMENTATION_PLAN_0.11.0.md)
- [OpenAPI v1 contract](../api/openapi-v1.yaml)

## Q-001 — Authentication provider (resolved 2026-11-14)

**Decision:** Auth0 as the initial OpenID Provider, using OpenID Connect and OAuth 2.0 Authorization Code Flow with PKCE (S256) for public clients.

- Browser: use the OIDC Authorization Code flow with a server-managed session and Secure, HttpOnly, SameSite cookies. Do not store long-lived tokens in browser local storage.
- Android: use the system browser / Custom Tabs with Authorization Code + PKCE S256. Keep refresh-token material protected by Android Keystore; enable refresh-token rotation and reuse detection where supported.
- Cortana World: use the browser session through Core's backend-for-frontend boundary; do not embed a client secret in the frontend.
- Core API: validate access-token signature via the provider JWKS and enforce issuer, audience, expiry, not-before, allowed algorithms and scopes/permissions. Do not merely decode JWTs.
- Provider and API secrets remain server-side. Use separate OIDC clients for browser and Android with exact redirect URI allowlists.
- Keep the existing memory capability as a temporary compatibility mechanism only. Migrate memory authorization to authenticated subject + server-side ownership mapping; never expose the legacy capability to native clients.

**Implementation guardrails:** provider configuration, callback handling, token exchange, cookie/session settings, logout/revocation, CSRF/state/nonce validation, PKCE verifier handling, key rotation and account recovery require dedicated tests and security review. No production tenant, secret or callback URL is provisioned by this architecture decision.

**Re-evaluation:** Auth0 is the selected initial provider, not a hard dependency in the Core domain. Implement an OIDC adapter so a future provider change does not require rewriting authorization policy.
