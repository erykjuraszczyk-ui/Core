export type IdentityConfig = {
  issuer: string;
  audience: string;
  jwksUrl: string;
};

export type AuthenticatedPrincipal = {
  subject: string;
  issuer: string;
  audience: string[];
  scopes: string[];
  expiresAt: number;
};

export type IdentityVerification =
  | { ok: true; principal: AuthenticatedPrincipal }
  | { ok: false; reason: "invalid_token" | "provider_unavailable" | "not_configured" };

type JwtHeader = { alg?: unknown; kid?: unknown; crit?: unknown };
type JwtClaims = {
  iss?: unknown; aud?: unknown; exp?: unknown; nbf?: unknown;
  iat?: unknown; sub?: unknown; scope?: unknown; permissions?: unknown;
};
type JsonWebKeySet = { keys?: JsonWebKey[] };

const CLOCK_TOLERANCE_SECONDS = 60;
const MAX_TOKEN_LENGTH = 16_384;
const MAX_JWKS_BYTES = 65_536;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid_base64url");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonPart<T>(value: string): T {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
  if (!isRecord(parsed)) throw new Error("invalid_json_part");
  return parsed as T;
}

function parseAudience(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) return [value];
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  return [];
}

function parseScopes(claims: JwtClaims): string[] {
  const scopes = typeof claims.scope === "string" ? claims.scope.split(/\s+/).filter(Boolean) : [];
  const permissions = Array.isArray(claims.permissions)
    ? claims.permissions.filter((item): item is string => typeof item === "string")
    : [];
  return [...new Set([...scopes, ...permissions])];
}

function isValidJwksUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

async function getSigningKey(jwksUrl: string, kid: string): Promise<CryptoKey | null | "unavailable"> {
  if (!isValidJwksUrl(jwksUrl)) return "unavailable";
  let response: Response;
  try {
    response = await fetch(jwksUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    return "unavailable";
  }
  if (!response.ok) return "unavailable";

  let raw: string;
  try {
    raw = await response.text();
    if (raw.length > MAX_JWKS_BYTES) return "unavailable";
  } catch {
    return "unavailable";
  }

  let jwks: JsonWebKeySet;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.keys)) return "unavailable";
    jwks = parsed as JsonWebKeySet;
  } catch {
    return "unavailable";
  }

  const candidate = jwks.keys?.find((key) => {
    const item = key as unknown as { kid?: string; kty?: string; alg?: string; use?: string; key_ops?: string[] };
    return item.kid === kid && item.kty === "RSA" &&
      (item.alg === undefined || item.alg === "RS256") &&
      (item.use === undefined || item.use === "sig") &&
      (item.key_ops === undefined || item.key_ops.includes("verify"));
  });
  if (!candidate) return null;

  try {
    return await crypto.subtle.importKey(
      "jwk",
      candidate,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
  } catch {
    return null;
  }
}

export async function verifyAccessToken(
  token: string,
  config: IdentityConfig,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<IdentityVerification> {
  if (!config.issuer || !config.audience || !config.jwksUrl) {
    return { ok: false, reason: "not_configured" };
  }
  if (token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: "invalid_token" };

  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return { ok: false, reason: "invalid_token" };

  let header: JwtHeader;
  let claims: JwtClaims;
  try {
    header = decodeJsonPart<JwtHeader>(parts[0]);
    claims = decodeJsonPart<JwtClaims>(parts[1]);
  } catch {
    return { ok: false, reason: "invalid_token" };
  }

  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid ||
      (header.crit !== undefined && (!Array.isArray(header.crit) || header.crit.length > 0))) {
    return { ok: false, reason: "invalid_token" };
  }

  const audiences = parseAudience(claims.aud);
  if (claims.iss !== config.issuer || !audiences.includes(config.audience) ||
      typeof claims.sub !== "string" || !claims.sub ||
      typeof claims.exp !== "number" || !Number.isFinite(claims.exp) ||
      claims.exp <= nowSeconds - CLOCK_TOLERANCE_SECONDS ||
      (typeof claims.nbf === "number" && claims.nbf > nowSeconds + CLOCK_TOLERANCE_SECONDS) ||
      (claims.nbf !== undefined && typeof claims.nbf !== "number") ||
      (typeof claims.iat === "number" && claims.iat > nowSeconds + CLOCK_TOLERANCE_SECONDS)) {
    return { ok: false, reason: "invalid_token" };
  }

  const key = await getSigningKey(config.jwksUrl, header.kid);
  if (key === "unavailable") return { ok: false, reason: "provider_unavailable" };
  if (!key) return { ok: false, reason: "invalid_token" };

  let validSignature = false;
  try {
    validSignature = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(parts[0] + "." + parts[1]),
    );
  } catch {
    return { ok: false, reason: "invalid_token" };
  }
  if (!validSignature) return { ok: false, reason: "invalid_token" };

  return {
    ok: true,
    principal: {
      subject: claims.sub,
      issuer: config.issuer,
      audience: audiences,
      scopes: parseScopes(claims),
      expiresAt: claims.exp,
    },
  };
}

export function readBearerToken(request: Request): string | null {
  const value = request.headers.get("Authorization") || "";
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(value);
  return match?.[1] || null;
}
