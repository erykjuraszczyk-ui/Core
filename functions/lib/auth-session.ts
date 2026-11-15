import { verifyAccessToken, type AuthenticatedPrincipal } from "./identity";
import type { D1Database } from "./memory-store";

export type AuthEnv = {
  AUTH_ISSUER?: string;
  AUTH_AUDIENCE?: string;
  AUTH_JWKS_URL?: string;
  CORTANA_DB?: D1Database;
  AUTH_CLIENT_ID?: string;
  AUTH_CLIENT_SECRET?: string;
  AUTH_REDIRECT_URI?: string;
  AUTH_POST_LOGOUT_REDIRECT_URI?: string;
  AUTH_SESSION_ENCRYPTION_KEY?: string;
  AUTH_COOKIE_NAME?: string;
  AUTH_SESSION_TTL_SECONDS?: string;
  AUTH_SCOPE?: string;
};

type OidcDiscovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  revocation_endpoint?: string;
  end_session_endpoint?: string;
};

type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  idToken: string;
};

type SessionRow = {
  session_hash: string;
  subject: string;
  issuer: string;
  encrypted_tokens: string;
  expires_at: number;
  refresh_lock_until: number;
};

type TransactionRow = {
  nonce: string;
  encrypted_verifier: string;
  redirect_after: string;
};

const DEFAULT_SESSION_TTL = 14 * 24 * 60 * 60;
const TRANSACTION_TTL = 10 * 60;
const MAX_RESPONSE_BYTES = 32_768;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid_base64url");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomSecret(bytes = 32): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64UrlEncode(value);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function encryptionKey(env: AuthEnv): Promise<CryptoKey> {
  const encoded = env.AUTH_SESSION_ENCRYPTION_KEY || "";
  const bytes = base64UrlDecode(encoded);
  if (bytes.byteLength !== 32) throw new Error("AUTH_SESSION_ENCRYPTION_KEY must encode exactly 32 bytes");
  return crypto.subtle.importKey("raw", toArrayBuffer(bytes), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSessionValue(env: AuthEnv, value: string): Promise<string> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await encryptionKey(env);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(new TextEncoder().encode(value)),
  );
  return base64UrlEncode(iv) + "." + base64UrlEncode(new Uint8Array(ciphertext));
}

export async function decryptSessionValue(env: AuthEnv, value: string): Promise<string> {
  const [ivPart, cipherPart, extra] = value.split(".");
  if (!ivPart || !cipherPart || extra !== undefined) throw new Error("invalid_ciphertext");
  const key = await encryptionKey(env);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(base64UrlDecode(ivPart)) },
    key,
    toArrayBuffer(base64UrlDecode(cipherPart)),
  );
  return new TextDecoder().decode(plaintext);
}

function validHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

export async function discoverOidc(env: AuthEnv): Promise<OidcDiscovery> {
  const issuer = env.AUTH_ISSUER || "";
  if (!validHttpsUrl(issuer) || !env.AUTH_AUDIENCE || !validHttpsUrl(env.AUTH_JWKS_URL) ||
      !env.AUTH_CLIENT_ID || !env.AUTH_CLIENT_SECRET || !validHttpsUrl(env.AUTH_REDIRECT_URI)) {
    throw new Error("identity_not_configured");
  }
  const discoveryUrl = issuer.replace(/\/$/, "") + "/.well-known/openid-configuration";
  const response = await fetch(discoveryUrl, {
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("oidc_discovery_unavailable");
  const raw = await response.text();
  if (raw.length > MAX_RESPONSE_BYTES) throw new Error("oidc_discovery_too_large");
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.issuer !== issuer ||
      !validHttpsUrl(value.authorization_endpoint) ||
      !validHttpsUrl(value.token_endpoint) ||
      !validHttpsUrl(value.jwks_uri) || value.jwks_uri !== env.AUTH_JWKS_URL ||
      (value.revocation_endpoint !== undefined && !validHttpsUrl(value.revocation_endpoint)) ||
      (value.end_session_endpoint !== undefined && !validHttpsUrl(value.end_session_endpoint))) {
    throw new Error("oidc_discovery_invalid");
  }
  return value as unknown as OidcDiscovery;
}

function cookieName(env: AuthEnv): string {
  const value = env.AUTH_COOKIE_NAME || "__Host-cortana_session";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new Error("invalid_cookie_name");
  return value;
}

export function readSessionCookie(request: Request, env: AuthEnv): string | null {
  const name = cookieName(env);
  const cookie = request.headers.get("Cookie") || "";
  for (const item of cookie.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    const value = item.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  }
  return null;
}

export function sessionCookie(env: AuthEnv, value: string, maxAge: number): string {
  return nameCookie(env, value, maxAge);
}
function nameCookie(env: AuthEnv, value: string, maxAge: number): string {
  return cookieName(env) + "=" + value + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + Math.max(0, maxAge);
}
export function clearSessionCookie(env: AuthEnv): string {
  return nameCookie(env, "", 0);
}

export function requireSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const url = new URL(value, "https://cortana.invalid");
    return url.origin === "https://cortana.invalid" ? url.pathname + url.search + url.hash : "/";
  } catch { return "/"; }
}

export async function beginLogin(env: AuthEnv, redirectAfter: string | null): Promise<string> {
  if (!env.CORTANA_DB) throw new Error("database_not_configured");
  const discovery = await discoverOidc(env);
  const state = randomSecret();
  const nonce = randomSecret();
  const verifier = randomSecret(32);
  const challenge = base64UrlEncode(new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(new TextEncoder().encode(verifier)))));
  const expiresAt = Math.floor(Date.now() / 1000) + TRANSACTION_TTL;
  await env.CORTANA_DB.prepare(
    "INSERT INTO oidc_transactions (state_hash, nonce, encrypted_verifier, redirect_after, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(
    await sha256Hex(state), nonce, await encryptSessionValue(env, verifier),
    safeRedirectPath(redirectAfter), expiresAt, Math.floor(Date.now() / 1000),
  ).run();

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("client_id", env.AUTH_CLIENT_ID!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", env.AUTH_REDIRECT_URI!);
  url.searchParams.set("scope", env.AUTH_SCOPE || "openid profile email offline_access");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (env.AUTH_AUDIENCE) url.searchParams.set("audience", env.AUTH_AUDIENCE);
  return url.toString();
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (raw.length > MAX_RESPONSE_BYTES) throw new Error("oidc_response_too_large");
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error("oidc_response_invalid");
  return parsed;
}

async function exchangeCode(env: AuthEnv, discovery: OidcDiscovery, code: string, verifier: string): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env.AUTH_CLIENT_ID!,
    client_secret: env.AUTH_CLIENT_SECRET!,
    code,
    redirect_uri: env.AUTH_REDIRECT_URI!,
    code_verifier: verifier,
  });
  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error("oidc_code_exchange_failed");
  return payload;
}

async function validateIdToken(env: AuthEnv, idToken: string, nonce: string): Promise<AuthenticatedPrincipal> {
  const result = await verifyAccessToken(idToken, {
    issuer: env.AUTH_ISSUER!,
    audience: env.AUTH_CLIENT_ID!,
    jwksUrl: env.AUTH_JWKS_URL!,
  });
  if (!result.ok) throw new Error("id_token_invalid");
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(idToken.split(".")[1]))) as Record<string, unknown>;
  if (payload.nonce !== nonce ||
      (result.principal.audience.length > 1 && payload.azp !== env.AUTH_CLIENT_ID)) {
    throw new Error("id_token_nonce_invalid");
  }
  return result.principal;
}

export async function completeLogin(
  env: AuthEnv, state: string, code: string,
): Promise<{ cookie: string; redirectAfter: string }> {
  if (!env.CORTANA_DB) throw new Error("database_not_configured");
  const stateHash = await sha256Hex(state);
  const now = Math.floor(Date.now() / 1000);
  const transaction = await env.CORTANA_DB.prepare(
    "DELETE FROM oidc_transactions WHERE state_hash = ? AND expires_at > ? RETURNING nonce, encrypted_verifier, redirect_after",
  ).bind(stateHash, now).first<TransactionRow>();
  if (!transaction) throw new Error("oidc_state_invalid");

  const verifier = await decryptSessionValue(env, transaction.encrypted_verifier);
  const discovery = await discoverOidc(env);
  const tokenResponse = await exchangeCode(env, discovery, code, verifier);
  if (typeof tokenResponse.id_token !== "string" ||
      typeof tokenResponse.access_token !== "string" ||
      typeof tokenResponse.expires_in !== "number" ||
      tokenResponse.expires_in <= 0) throw new Error("oidc_token_response_invalid");

  const principal = await validateIdToken(env, tokenResponse.id_token, transaction.nonce);
  const apiToken = await verifyAccessToken(tokenResponse.access_token, {
    issuer: env.AUTH_ISSUER!, audience: env.AUTH_AUDIENCE!, jwksUrl: env.AUTH_JWKS_URL!,
  });
  if (!apiToken.ok) throw new Error("api_access_token_invalid");
  const refreshToken = typeof tokenResponse.refresh_token === "string" ? tokenResponse.refresh_token : null;
  const tokens: TokenSet = {
    accessToken: tokenResponse.access_token,
    refreshToken,
    idToken: tokenResponse.id_token,
  };
  const sessionId = randomSecret();
  const sessionHash = await sha256Hex(sessionId);
  const sessionTtl = Math.min(
    Math.max(300, Number(env.AUTH_SESSION_TTL_SECONDS) || DEFAULT_SESSION_TTL),
    30 * 24 * 60 * 60,
  );
  const expiresAt = now + sessionTtl;
  await env.CORTANA_DB.prepare(
    "INSERT INTO auth_sessions (session_hash, subject, issuer, encrypted_tokens, expires_at, created_at, updated_at, refresh_lock_until) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
  ).bind(
    sessionHash, principal.subject, principal.issuer,
    await encryptSessionValue(env, JSON.stringify(tokens)),
    expiresAt, now, now,
  ).run();
  return {
    cookie: sessionCookie(env, sessionId, sessionTtl),
    redirectAfter: transaction.redirect_after,
  };
}

export async function findSession(env: AuthEnv, request: Request): Promise<{ row: SessionRow; sessionId: string } | null> {
  if (!env.CORTANA_DB) return null;
  const sessionId = readSessionCookie(request, env);
  if (!sessionId) return null;
  const row = await env.CORTANA_DB.prepare(
    "SELECT session_hash, subject, issuer, encrypted_tokens, expires_at, refresh_lock_until FROM auth_sessions WHERE session_hash = ? AND expires_at > ? LIMIT 1",
  ).bind(await sha256Hex(sessionId), Math.floor(Date.now() / 1000)).first<SessionRow>();
  return row ? { row, sessionId } : null;
}

export function sessionResponse(row: SessionRow): { authenticated: true; user: { subject: string; issuer: string }; expiresAt: number } {
  return { authenticated: true, user: { subject: row.subject, issuer: row.issuer }, expiresAt: row.expires_at };
}

export async function refreshSession(env: AuthEnv, row: SessionRow): Promise<void> {
  if (!env.CORTANA_DB) throw new Error("database_not_configured");
  const now = Math.floor(Date.now() / 1000);
  if (row.refresh_lock_until > now) throw new Error("refresh_in_progress");
  const lockUntil = now + 30;
  const locked = await env.CORTANA_DB.prepare(
    "UPDATE auth_sessions SET refresh_lock_until = ? WHERE session_hash = ? AND refresh_lock_until <= ? AND expires_at > ?",
  ).bind(lockUntil, row.session_hash, now, now).run();
  if (!locked.meta?.changes) throw new Error("refresh_in_progress");

  try {
    const tokens = JSON.parse(await decryptSessionValue(env, row.encrypted_tokens)) as TokenSet;
    if (!tokens.refreshToken) throw new Error("refresh_token_missing");
    const discovery = await discoverOidc(env);
    const response = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: env.AUTH_CLIENT_ID!,
        client_secret: env.AUTH_CLIENT_SECRET!,
        refresh_token: tokens.refreshToken,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok || typeof payload.access_token !== "string" || typeof payload.expires_in !== "number") {
      throw new Error("refresh_token_rejected");
    }
    const checked = await verifyAccessToken(payload.access_token, {
      issuer: env.AUTH_ISSUER!, audience: env.AUTH_AUDIENCE!, jwksUrl: env.AUTH_JWKS_URL!,
    });
    if (!checked.ok || checked.principal.subject !== row.subject) throw new Error("refreshed_access_token_invalid");
    const rotated: TokenSet = {
      accessToken: payload.access_token,
      refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : tokens.refreshToken,
      idToken: typeof payload.id_token === "string" ? payload.id_token : tokens.idToken,
    };
    const ttl = Math.min(
      Math.max(300, Number(env.AUTH_SESSION_TTL_SECONDS) || DEFAULT_SESSION_TTL),
      30 * 24 * 60 * 60,
    );
    await env.CORTANA_DB.prepare(
      "UPDATE auth_sessions SET encrypted_tokens = ?, expires_at = ?, updated_at = ?, refresh_lock_until = 0 WHERE session_hash = ? AND refresh_lock_until = ?",
    ).bind(
      await encryptSessionValue(env, JSON.stringify(rotated)),
      now + ttl, now, row.session_hash, lockUntil,
    ).run();
  } catch (error) {
    await env.CORTANA_DB.prepare(
      "UPDATE auth_sessions SET refresh_lock_until = 0 WHERE session_hash = ? AND refresh_lock_until = ?",
    ).bind(row.session_hash, lockUntil).run();
    const reason = error instanceof Error ? error.message : "";
    if (reason === "refresh_token_rejected" || reason === "refresh_token_missing") {
      await env.CORTANA_DB.prepare("DELETE FROM auth_sessions WHERE session_hash = ?").bind(row.session_hash).run();
    }
    throw error;
  }
}

export async function logoutSession(env: AuthEnv, row: SessionRow): Promise<void> {
  if (!env.CORTANA_DB) return;
  try {
    const tokens = JSON.parse(await decryptSessionValue(env, row.encrypted_tokens)) as TokenSet;
    if (tokens.refreshToken) {
      const discovery = await discoverOidc(env);
      if (discovery.revocation_endpoint) {
        await fetch(discovery.revocation_endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: tokens.refreshToken,
            token_type_hint: "refresh_token",
            client_id: env.AUTH_CLIENT_ID!,
            client_secret: env.AUTH_CLIENT_SECRET!,
          }),
          redirect: "error",
          signal: AbortSignal.timeout(5000),
        });
      }
    }
  } catch {
    // Local session revocation must proceed even when the provider is unavailable.
  }
  await env.CORTANA_DB.prepare("DELETE FROM auth_sessions WHERE session_hash = ?").bind(row.session_hash).run();
}
