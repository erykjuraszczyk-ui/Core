import { readBearerToken, verifyAccessToken, type IdentityConfig } from "../lib/identity";

type Env = {
  AUTH_ISSUER?: string;
  AUTH_AUDIENCE?: string;
  AUTH_JWKS_URL?: string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Vary": "Authorization",
    },
  });
}

function validOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (!validOrigin(request)) return json({ error: "Niedozwolone źródło żądania." }, 403);

  const config: IdentityConfig = {
    issuer: env.AUTH_ISSUER || "",
    audience: env.AUTH_AUDIENCE || "",
    jwksUrl: env.AUTH_JWKS_URL || "",
  };
  if (!config.issuer || !config.audience || !config.jwksUrl) {
    return json({ error: "Weryfikacja tożsamości nie jest skonfigurowana." }, 503);
  }

  const token = readBearerToken(request);
  if (!token) return json({ error: "Brak prawidłowego tokenu Bearer." }, 401);

  const result = await verifyAccessToken(token, config);
  if (!result.ok) {
    if (result.reason === "provider_unavailable") {
      return json({ error: "Dostawca kluczy tożsamości jest chwilowo niedostępny." }, 503);
    }
    return json({ error: "Token jest nieprawidłowy lub wygasł." }, 401);
  }

  return json({
    authenticated: true,
    user: {
      subject: result.principal.subject,
      issuer: result.principal.issuer,
      audience: result.principal.audience,
      scopes: result.principal.scopes,
      expiresAt: result.principal.expiresAt,
    },
  });
}
