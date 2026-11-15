import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyAccessToken, readBearerToken, type IdentityConfig } from "../functions/lib/identity";

const config: IdentityConfig = {
  issuer: "https://identity.example/",
  audience: "https://api.cortana.example",
  jwksUrl: "https://identity.example/.well-known/jwks.json",
};

let privateKey: CryptoKey;
let publicJwk: JsonWebKey & { kid: string; alg: string; use: string };

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function token(overrides: Record<string, unknown> = {}, signingKey = privateKey): Promise<string> {
  const header = encode({ alg: "RS256", typ: "JWT", kid: "test-key-1" });
  const claims = encode({
    iss: config.issuer,
    aud: config.audience,
    sub: "auth0|user-123",
    iat: 1_800_000_000,
    exp: 1_800_000_600,
    scope: "openid profile identity:read",
    ...overrides,
  });
  const signingInput = header + "." + claims;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signingKey,
    new TextEncoder().encode(signingInput),
  );
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  const encodedSignature = btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return signingInput + "." + encodedSignature;
}

describe("CORTANA identity verification", () => {
  beforeAll(async () => {
    const pair = await crypto.subtle.generateKey(
      { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["sign", "verify"],
    );
    privateKey = pair.privateKey;
    publicJwk = {
      ...(await crypto.subtle.exportKey("jwk", pair.publicKey)),
      kid: "test-key-1",
      alg: "RS256",
      use: "sig",
    };
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 }),
    ));
  });

  it("accepts a correctly signed token and returns a minimal principal", async () => {
    const jwt = await token();
    const result = await verifyAccessToken(jwt, config, 1_800_000_100);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.principal.subject).toBe("auth0|user-123");
      expect(result.principal.scopes).toContain("identity:read");
    }
  });

  it("rejects an unexpected issuer", async () => {
    const jwt = await token({ iss: "https://attacker.example/" });
    const result = await verifyAccessToken(jwt, config, 1_800_000_100);
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("rejects an unexpected audience", async () => {
    const jwt = await token({ aud: "https://wrong.example" });
    const result = await verifyAccessToken(jwt, config, 1_800_000_100);
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("rejects an expired token", async () => {
    const jwt = await token({ exp: 1_800_000_000 });
    const result = await verifyAccessToken(jwt, config, 1_800_000_100);
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("rejects algorithms other than RS256", async () => {
    const jwt = await token();
    const altered = encode({ alg: "none", kid: "test-key-1" }) + "." + jwt.split(".")[1] + "." + jwt.split(".")[2];
    const result = await verifyAccessToken(altered, config, 1_800_000_100);
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("reports JWKS transport failure as unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const jwt = await token();
    const result = await verifyAccessToken(jwt, config, 1_800_000_100);
    expect(result).toEqual({ ok: false, reason: "provider_unavailable" });
  });

  it("accepts only a strict bearer JWT header", () => {
    expect(readBearerToken(new Request("https://core.example/api/identity", {
      headers: { Authorization: "Bearer a.b.c" },
    }))).toBe("a.b.c");
    expect(readBearerToken(new Request("https://core.example/api/identity", {
      headers: { Authorization: "bearer a.b.c" },
    }))).toBeNull();
  });
});
