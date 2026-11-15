# CORTANA Identity Core 0.11.1

## Scope

This release introduces the first server-side OIDC access-token verification boundary. It does not implement the interactive authorization-code callback, browser BFF session, refresh-token storage, logout/revocation, account linking or memory ownership migration.

## Runtime configuration

Set these values as Cloudflare Pages Functions environment variables:

- `AUTH_ISSUER`: exact issuer URL from the Auth0 API configuration, including its trailing slash when present.
- `AUTH_AUDIENCE`: the API audience configured for the Auth0 API.
- `AUTH_JWKS_URL`: HTTPS JWKS endpoint for the same issuer, normally `https://YOUR_DOMAIN/.well-known/jwks.json`.

No client secret is required by this verifier. Never put Auth0 client secrets in the frontend, APK, Git repository or public environment variables.

## Endpoint

`GET /api/identity`

Send `Authorization: Bearer <access_token>`. A successful response returns only the subject, issuer, audience, scopes and token expiry. It does not return profile data or create a session.

Status codes:

- `200`: signature and required claims verified.
- `401`: missing, malformed, expired or invalid token.
- `403`: rejected Origin.
- `503`: identity configuration missing or JWKS provider unavailable.

## Verification policy

- RS256 only; key selected by `kid` from the configured HTTPS JWKS endpoint.
- Verify the signature with Web Crypto; never trust decoded claims alone.
- Require exact issuer, configured audience, non-empty subject and numeric expiry.
- Enforce `nbf` when present, with 60 seconds of clock tolerance.
- Parse `scope` and Auth0-style `permissions` into a deduplicated list.
- Do not log bearer tokens or return raw JWT claims.
- JWKS is fetched for each verification in this initial implementation. Add bounded per-isolate caching with unknown-kid refresh only after dedicated rotation tests.

## Explicit non-goals / security gate

The existing `/api/memory` capability remains unchanged and isolated. This release does not bind an authenticated subject to a D1 memory space and does not enable cross-device memory access. Do not treat a successful `/api/identity` response as a browser session. The next identity milestone must implement OIDC authorization-code + PKCE state/nonce validation, secure server-side sessions, CSRF controls, logout/revocation and subject-to-memory ownership mapping before protected data routes are migrated.
