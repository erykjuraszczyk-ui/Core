export type MemoryKind = "semantic" | "episode";

export type MemoryEntry = {
  id: string;
  kind: MemoryKind;
  content: string;
  tags: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
};

export interface D1Result<T = unknown> {
  results?: T[];
  success?: boolean;
  meta?: { changes?: number };
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1Statement;
}

type MemorySpace = { id: string; token_hash: string };
type MemoryRow = {
  id: string;
  kind: MemoryKind;
  content: string;
  tags_json: string;
  source: string;
  created_at: string;
  updated_at: string;
};

export function createMemoryToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashMemoryToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function findMemorySpace(db: D1Database, token: string): Promise<MemorySpace | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = await hashMemoryToken(token);
  return db.prepare("SELECT id, token_hash FROM memory_spaces WHERE token_hash = ? LIMIT 1")
    .bind(tokenHash).first<MemorySpace>();
}

export function mapMemoryRow(row: MemoryRow): MemoryEntry {
  let tags: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.tags_json);
    if (Array.isArray(parsed)) tags = parsed.filter((tag): tag is string => typeof tag === "string").slice(0, 10);
  } catch { /* malformed legacy metadata is ignored */ }
  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    tags,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function retrieveMemoryContext(
  db: D1Database,
  spaceId: string,
  query: string,
): Promise<MemoryEntry[]> {
  const result = await db.prepare(
    "SELECT id, kind, content, tags_json, source, created_at, updated_at FROM memory_entries WHERE space_id = ? ORDER BY updated_at DESC LIMIT 30",
  ).bind(spaceId).all<MemoryRow>();

  const rows = (result.results || []).map(mapMemoryRow);
  const terms = [...new Set((query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter((term) => !STOP_WORDS.has(term)))];
  const ranked = rows.map((entry, index) => {
    const haystack = (entry.content + " " + entry.tags.join(" ")).toLowerCase();
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    return { entry, score, index };
  });
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.filter((item) => item.score > 0).slice(0, 6).map((item) => item.entry);
}

const STOP_WORDS = new Set(["oraz", "który", "która", "które", "jest", "jako", "tego", "taka", "takie", "przez", "this", "that", "with", "from", "have", "your"]);
