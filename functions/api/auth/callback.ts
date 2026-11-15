import { clearSessionCookie, completeLogin, type AuthEnv } from "../../lib/auth-session";

export async function onRequestGet(context: { request: Request; env: AuthEnv }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (providerError || !state || !code || state.length > 256 || code.length > 4096) {
    return new Response("Logowanie nie powiodło się. Wróć do aplikacji i spróbuj ponownie.", {
      status: 400, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }
  try {
    const result = await completeLogin(env, state, code);
    return new Response(null, {
      status: 302,
      headers: {
        Location: new URL(result.redirectAfter, url.origin).toString(),
        "Set-Cookie": result.cookie,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response("Nie udało się bezpiecznie zakończyć logowania.", {
      status: 401,
      headers: { "Set-Cookie": clearSessionCookie(env), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }
}
