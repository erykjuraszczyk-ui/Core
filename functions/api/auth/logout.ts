import { clearSessionCookie, findSession, logoutSession, requireSameOrigin, type AuthEnv } from "../../lib/auth-session";

export async function onRequestPost(context: { request: Request; env: AuthEnv }): Promise<Response> {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return Response.json({ error: "Niedozwolone źródło żądania." }, { status: 403 });
  const session = await findSession(env, request);
  if (session) await logoutSession(env, session.row);
  return new Response(JSON.stringify({ loggedOut: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": clearSessionCookie(env),
      "Cache-Control": "no-store",
    },
  });
}
