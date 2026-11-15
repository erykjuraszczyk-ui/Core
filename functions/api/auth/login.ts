import { beginLogin, type AuthEnv } from "../../lib/auth-session";

export async function onRequestGet(context: { request: Request; env: AuthEnv }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const target = await beginLogin(context.env, url.searchParams.get("returnTo"));
    return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Logowanie jest chwilowo niedostępne lub nie zostało skonfigurowane." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
