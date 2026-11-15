# CORTANA Identity Session 0.11.2

## Scope

This milestone adds a server-side OIDC Authorization Code + PKCE login flow, state/nonce validation, encrypted server-side token storage, opaque HttpOnly session cookies, session inspection, refresh-token rotation support and local logout/revocation.

The browser receives only an opaque session cookie. Access, ID and refresh tokens remain encrypted in D1 and are never returned to browser JavaScript.

## Routes

- `GET /api/auth/login?returnTo=/`: start OIDC login; stores a one-time state/nonce/PKCE transaction and redirects to the provider.
- `GET /api/auth/callback`: consume state once, exchange the code, validate the ID token signature/issuer/audience/nonce and API access token, then create a server session.
- `GET /api/auth/session`: return minimal session identity and expiry; no tokens.
- `POST /api/auth/refresh`: same-origin only; refresh under a D1 lease and persist a rotated refresh token when returned.
- `POST /api/auth/logout`: same-origin only; attempt provider refresh-token revocation and always delete the local session.

## Cloudflare Pages configuration

Required bindings / secrets:

- D1 binding: `CORTANA_DB`
- `AUTH_ISSUER`: exact OIDC issuer URL, including trailing slash when specified by discovery.
- `AUTH_AUDIENCE`: API audience expected in access tokens.
- `AUTH_JWKS_URL`: issuer JWKS URL used by the existing access-token verifier.
- `AUTH_CLIENT_ID`: confidential web application client ID.
- `AUTH_CLIENT_SECRET`: server-side confidential web application secret.
- `AUTH_REDIRECT_URI`: exact callback URL, e.g. `https://YOUR_CORE_HOST/api/auth/callback`.
- `AUTH_SESSION_ENCRYPTION_KEY`: base64url-encoded 32-byte random AES-256 key.
- Optional `AUTH_COOKIE_NAME`, `AUTH_SESSION_TTL_SECONDS`, `AUTH_SCOPE`.

Do not commit production secrets or use Vite `VITE_*` variables for credentials. Configure Auth0 Allowed Callback URLs and Allowed Logout URLs to match exact deployed URLs. Enable Refresh Token Rotation and reuse detection in the Auth0 application settings; request `offline_access`.

## Security controls

- Authorization Code + PKCE S256; one-time state and nonce; ten-minute transaction expiry.
- Discovery issuer equality and HTTPS-only OIDC endpoints.
- ID token signature, issuer, client audience, expiry, not-before and nonce validation; access token signature, issuer and API audience validation.
- 256-bit opaque session ID; only its SHA-256 hash is stored in D1.
- AES-256-GCM encryption of token sets and PKCE verifier at rest; unique 96-bit IV per encryption.
- `__Host-` cookie by default: Secure, HttpOnly, SameSite=Lax, Path=/, no Domain.
- Same-origin checks on refresh and logout; no-store responses.
- D1 refresh lease reduces concurrent refresh-token reuse races.
- Local logout deletes the server session even if provider revocation is unavailable.

## Important limits

This does not yet migrate existing memory capabilities to account ownership, enable cross-device memory access, add native Android deep-link login, implement global Auth0 logout redirects, or provide account linking/recovery. The browser BFF session is the only client session in this milestone. Android must continue to use a separate public-client Authorization Code + PKCE flow in a later native integration milestone; it must never receive the confidential web client secret.

Before production rollout: provision the Auth0 confidential web app, set exact callback/logout URLs, create a fresh encryption key in Cloudflare secrets, apply D1 migration 0002, and complete a deployment-level security review.
