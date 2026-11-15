import { findSession, refreshSession, type AuthEnv, requireSameOrigin } from "../../lib/auth-session";

export async function onRequestPost(context: { request: Request; env: AuthEnv }): Promise<Response> {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return Response.json({ error: "Niedozwolone źródło żądania." }, { status: 403 });
  const session = await findSession(env, request);
  if (!session) return Response.json({ error: "Sesja wygasła." }, { status: 401 });
  try {
    await refreshSession(env, session.row);
    return Response.json({ refreshed: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "refresh_in_progress") {
      return Response.json({ error: "Odświeżanie sesji już trwa." }, { status: 409, headers: { "Retry-After": "2", "Cache-Control": "no-store" } });
    }
    return Response.json({ error: "Nie udało się odświeżyć sesji. Zaloguj się ponownie." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}
