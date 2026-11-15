import { beginLogin, oidcStateCookie, type AuthEnv } from "../../lib/auth-session";

export async function onRequestGet(context: { request: Request; env: AuthEnv }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const target = await beginLogin(context.env, url.searchParams.get("returnTo"));
    const state = new URL(target).searchParams.get("state");
    if (!state) throw new Error("oidc_state_missing");
    return new Response(null, { status: 302, headers: { Location: target, "Set-Cookie": oidcStateCookie(state), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    return Response.json({ error: "Logowanie jest chwilowo niedostępne lub nie zostało skonfigurowane." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
