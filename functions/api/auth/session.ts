import { findSession, sessionResponse, type AuthEnv } from "../../lib/auth-session";

export async function onRequestGet(context: { request: Request; env: AuthEnv }): Promise<Response> {
  const session = await findSession(context.env, context.request);
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(sessionResponse(session.row), { headers: { "Cache-Control": "no-store", "Vary": "Cookie" } });
}
