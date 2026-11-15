import { describe, expect, it, vi } from "vitest";
import {
  beginLogin, decryptSessionValue, encryptSessionValue, readSessionCookie,
  requireSameOrigin, type AuthEnv,
} from "../functions/lib/auth-session";
import type { D1Database } from "../functions/lib/memory-store";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function makeEnv(): AuthEnv {
  return {
    AUTH_ISSUER: "https://identity.example/",
    AUTH_AUDIENCE: "https://api.cortana.example",
    AUTH_JWKS_URL: "https://identity.example/.well-known/jwks.json",
    AUTH_CLIENT_ID: "web-client",
    AUTH_CLIENT_SECRET: "server-only-secret",
    AUTH_REDIRECT_URI: "https://core.example/api/auth/callback",
    AUTH_SESSION_ENCRYPTION_KEY: base64Url(crypto.getRandomValues(new Uint8Array(32))),
  };
}

describe("CORTANA BFF session primitives", () => {
  it("encrypts token material with authenticated AES-GCM and decrypts it", async () => {
    const env = makeEnv();
    const plaintext = JSON.stringify({ refreshToken: "sensitive" });
    const ciphertext = await encryptSessionValue(env, plaintext);
    expect(ciphertext).not.toContain("sensitive");
    await expect(decryptSessionValue(env, ciphertext)).resolves.toBe(plaintext);
  });

  it("rejects ciphertext tampering", async () => {
    const env = makeEnv();
    const ciphertext = await encryptSessionValue(env, "token-set");
    const [iv, data] = ciphertext.split(".");
    const last = data.slice(-1) === "A" ? "B" : "A";
    await expect(decryptSessionValue(env, iv + "." + data.slice(0, -1) + last)).rejects.toThrow();
  });

  it("accepts only the configured opaque session cookie", () => {
    const env = makeEnv();
    const id = "A".repeat(43);
    const request = new Request("https://core.example/api/auth/session", {
      headers: { Cookie: "__Host-cortana_session=" + id + "; other=value" },
    });
    expect(readSessionCookie(request, env)).toBe(id);
    expect(readSessionCookie(new Request(request.url, {
      headers: { Cookie: "__Host-cortana_session=short" },
    }), env)).toBeNull();
  });

  it("requires an exact same-origin header for state-changing requests", () => {
    expect(requireSameOrigin(new Request("https://core.example/api/auth/logout", {
      method: "POST", headers: { Origin: "https://core.example" },
    }))).toBe(true);
    expect(requireSameOrigin(new Request("https://core.example/api/auth/logout", {
      method: "POST", headers: { Origin: "https://evil.example" },
    }))).toBe(false);
    expect(requireSameOrigin(new Request("https://core.example/api/auth/logout", { method: "POST" }))).toBe(false);
  });

  it("creates an Authorization Code + PKCE S256 challenge and stores a hash of state", async () => {
    const env = makeEnv();
    const writes: unknown[][] = [];
    const db = {
      prepare: (query: string) => ({
        bind: (...values: unknown[]) => ({
          run: async () => { writes.push([query, ...values]); return { meta: { changes: 1 } }; },
          first: async () => null,
          all: async () => ({ results: [] }),
        }),
      }),
    } as unknown as D1Database;
    env.CORTANA_DB = db;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      issuer: env.AUTH_ISSUER,
      authorization_endpoint: "https://identity.example/authorize",
      token_endpoint: "https://identity.example/oauth/token",
      jwks_uri: env.AUTH_JWKS_URL,
      revocation_endpoint: "https://identity.example/oauth/revoke",
    }), { status: 200 })));

    const authorizationUrl = new URL(await beginLogin(env, "/dashboard"));
    expect(authorizationUrl.searchParams.get("response_type")).toBe("code");
    expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorizationUrl.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(authorizationUrl.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(authorizationUrl.searchParams.get("nonce")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(writes).toHaveLength(1);
    expect(writes[0][0]).toContain("INSERT INTO oidc_transactions");
    expect(writes[0][2]).not.toBe(authorizationUrl.searchParams.get("state"));
    expect(writes[0][4]).toBe("/dashboard");
  });

  it("rejects an external returnTo redirect through the OIDC start", async () => {
    const env = makeEnv();
    let insert: unknown[] = [];
    env.CORTANA_DB = {
      prepare: (query: string) => ({
        bind: (...values: unknown[]) => ({ run: async () => { insert = [query, ...values]; return { meta: { changes: 1 } }; } }),
      }),
    } as unknown as D1Database;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      issuer: env.AUTH_ISSUER,
      authorization_endpoint: "https://identity.example/authorize",
      token_endpoint: "https://identity.example/oauth/token",
      jwks_uri: env.AUTH_JWKS_URL,
    }), { status: 200 })));
    await beginLogin(env, "https://evil.example/steal");
    expect(insert[4]).toBe("/");
  });
});
