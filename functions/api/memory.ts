import {
  createMemoryToken,
  findMemorySpace,
  mapMemoryRow,
  type D1Database,
  type MemoryKind,
} from "../lib/memory-store";

type Env = { CORTANA_DB?: D1Database };

type MemoryRow = {
  id: string;
  kind: MemoryKind;
  content: string;
  tags_json: string;
  source: string;
  created_at: string;
  updated_at: string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function validOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get("Authorization") || "";
  const match = /^Bearer ([a-f0-9]{64})$/.exec(value);
  return match?.[1] || null;
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return null;
  const raw = await request.text();
  if (raw.length > 12000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (!validOrigin(request)) return json({ error: "Niedozwolone źródło żądania." }, 403);
  if (!env.CORTANA_DB) return json({ error: "Pamięć nie jest skonfigurowana. Dodaj binding D1 CORTANA_DB." }, 503);
  const token = bearerToken(request);
  if (!token) return json({ error: "Brak tokenu pamięci." }, 401);
  const space = await findMemorySpace(env.CORTANA_DB, token);
  if (!space) return json({ error: "Nieprawidłowy token pamięci." }, 401);

  const result = await env.CORTANA_DB.prepare(
    "SELECT id, kind, content, tags_json, source, created_at, updated_at FROM memory_entries WHERE space_id = ? ORDER BY updated_at DESC LIMIT 100",
  ).bind(space.id).all<MemoryRow>();
  return json({ entries: (result.results || []).map(mapMemoryRow) });
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (!validOrigin(request)) return json({ error: "Niedozwolone źródło żądania." }, 403);
  if (!env.CORTANA_DB) return json({ error: "Pamięć nie jest skonfigurowana. Dodaj binding D1 CORTANA_DB." }, 503);
  const body = await parseBody(request);
  if (!body) return json({ error: "Nieprawidłowy JSON lub Content-Type." }, 400);

  if (body.action === "initialize") {
    const token = createMemoryToken();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const spaceId = crypto.randomUUID();
    await env.CORTANA_DB.prepare(
      "INSERT INTO memory_spaces (id, token_hash, created_at) VALUES (?, ?, ?)",
    ).bind(spaceId, tokenHash, new Date().toISOString()).run();
    return json({ token, created: true }, 201);
  }

  const token = bearerToken(request);
  if (!token) return json({ error: "Brak tokenu pamięci." }, 401);
  const space = await findMemorySpace(env.CORTANA_DB, token);
  if (!space) return json({ error: "Nieprawidłowy token pamięci." }, 401);

  if (body.action !== "save" && body.action !== "update") return json({ error: "Nieznana operacja pamięci." }, 400);
  if (typeof body.content !== "string" || !body.content.trim() || body.content.length > 4000) {
    return json({ error: "Treść pamięci musi mieć od 1 do 4000 znaków." }, 400);
  }
  const kind: MemoryKind = body.kind === "episode" ? "episode" : "semantic";
  if (body.action === "update") {
    if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id)) return json({ error: "Nieprawidłowy identyfikator wpisu." }, 400);
    const now = new Date().toISOString();
    const updated = await env.CORTANA_DB.prepare(
      "UPDATE memory_entries SET kind = ?, content = ?, updated_at = ? WHERE id = ? AND space_id = ?",
    ).bind(kind, body.content.trim(), now, body.id, space.id).run();
    if (!updated.meta?.changes) return json({ error: "Nie znaleziono wpisu pamięci." }, 404);
    return json({ updated: true, id: body.id, kind, content: body.content.trim(), updatedAt: now });
  }
  const count = await env.CORTANA_DB.prepare("SELECT COUNT(*) AS total FROM memory_entries WHERE space_id = ?")
    .bind(space.id).first<{ total: number }>();
  if ((count?.total || 0) >= 100) return json({ error: "Pamięć osiągnęła limit 100 wpisów. Usuń niepotrzebne wpisy przed dodaniem kolejnych." }, 409);
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 10)
    : [];
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.CORTANA_DB.prepare(
    "INSERT INTO memory_entries (id, space_id, kind, content, tags_json, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(id, space.id, kind, body.content.trim(), JSON.stringify(tags), "user-approved", now, now).run();
  return json({ entry: { id, kind, content: body.content.trim(), tags, source: "user-approved", createdAt: now, updatedAt: now } }, 201);
}

export async function onRequestDelete(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (!validOrigin(request)) return json({ error: "Niedozwolone źródło żądania." }, 403);
  if (!env.CORTANA_DB) return json({ error: "Pamięć nie jest skonfigurowana." }, 503);
  const token = bearerToken(request);
  if (!token) return json({ error: "Brak tokenu pamięci." }, 401);
  const space = await findMemorySpace(env.CORTANA_DB, token);
  if (!space) return json({ error: "Nieprawidłowy token pamięci." }, 401);

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    await env.CORTANA_DB.prepare("DELETE FROM memory_entries WHERE id = ? AND space_id = ?").bind(id, space.id).run();
    return json({ deleted: true });
  }
  await env.CORTANA_DB.prepare("DELETE FROM memory_entries WHERE space_id = ?").bind(space.id).run();
  await env.CORTANA_DB.prepare("DELETE FROM memory_spaces WHERE id = ?").bind(space.id).run();
  return json({ deleted: true, all: true });
}
