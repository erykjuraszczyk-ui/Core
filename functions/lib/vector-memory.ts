import type { D1Database, MemoryEntry } from "./memory-store";

export type VectorizeIndex = {
  upsert(vectors: Array<{ id: string; values: number[]; metadata: Record<string, string> }>): Promise<unknown>;
  query(vector: number[], options: {
    topK: number;
    filter: Record<string, unknown>;
    returnMetadata: "all";
  }): Promise<{ matches?: Array<{ id: string; score?: number }> }>;
  deleteByIds(ids: string[]): Promise<unknown>;
};

type EmbeddingEnv = {
  CORTANA_LLM_API_KEY?: string;
  CORTANA_LLM_BASE_URL?: string;
  CORTANA_EMBEDDING_MODEL?: string;
};

type EmbeddingResponse = { data?: Array<{ embedding?: number[] }> };

export async function createEmbedding(text: string, env: EmbeddingEnv): Promise<number[] | null> {
  if (!env.CORTANA_LLM_API_KEY) return null;
  const base = (env.CORTANA_LLM_BASE_URL || "https://api.openai.com/v1").replace(/\\/+$/, "");
  let endpoint: string;
  try {
    const url = new URL(base);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    endpoint = `${url.toString().replace(/\\/+$/, "")}/embeddings`;
  } catch { return null; }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CORTANA_LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.CORTANA_EMBEDDING_MODEL || "text-embedding-3-small",
        input: text.slice(0, 8000),
        encoding_format: "float",
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as EmbeddingResponse;
    const vector = payload.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.length < 1 || vector.length > 4096) return null;
    if (!vector.every((value) => typeof value === "number" && Number.isFinite(value))) return null;
    return vector;
  } catch { return null; }
}

export async function upsertMemoryVector(
  index: VectorizeIndex | undefined,
  env: EmbeddingEnv,
  entry: MemoryEntry,
  spaceId: string,
): Promise<boolean> {
  if (!index) return false;
  const vector = await createEmbedding(`${entry.content}\\nTags: ${entry.tags.join(", ")}\\nType: ${entry.kind}`, env);
  if (!vector) return false;
  try {
    await index.upsert([{
      id: entry.id,
      values: vector,
      metadata: { spaceId, kind: entry.kind, source: entry.source },
    }]);
    return true;
  } catch { return false; }
}

export async function deleteMemoryVectors(index: VectorizeIndex | undefined, ids: string[]): Promise<void> {
  if (!index || !ids.length) return;
  try { await index.deleteByIds(ids); } catch { /* D1 remains authoritative; stale vectors are ignored */ }
}

export async function retrieveVectorMemoryContext(
  db: D1Database,
  index: VectorizeIndex | undefined,
  env: EmbeddingEnv,
  spaceId: string,
  query: string,
): Promise<MemoryEntry[] | null> {
  if (!index) return null;
  const vector = await createEmbedding(query, env);
  if (!vector) return null;
  try {
    const result = await index.query(vector, {
      topK: 12,
      filter: { spaceId: { $eq: spaceId } },
      returnMetadata: "all",
    });
    const ids = (result.matches || []).map((match) => match.id).filter((id) => /^[a-f0-9-]{36}$/i.test(id)).slice(0, 12);
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const rows = await db.prepare(
      `SELECT id, kind, content, tags_json, source, created_at, updated_at FROM memory_entries WHERE space_id = ? AND id IN (${placeholders})`,
    ).bind(spaceId, ...ids).all<{
      id: string; kind: "semantic" | "episode"; content: string; tags_json: string;
      source: string; created_at: string; updated_at: string;
    }>();
    const byId = new Map((rows.results || []).map((row) => [row.id, row]));
    const ordered = ids.map((id) => byId.get(id)).filter((row): row is NonNullable<typeof row> => Boolean(row));
    return ordered.slice(0, 6).map((row) => {
      let tags: string[] = [];
      try {
        const parsed: unknown = JSON.parse(row.tags_json);
        if (Array.isArray(parsed)) tags = parsed.filter((tag): tag is string => typeof tag === "string").slice(0, 10);
      } catch { /* ignore malformed metadata */ }
      return {
        id: row.id, kind: row.kind, content: row.content, tags, source: row.source,
        createdAt: row.created_at, updatedAt: row.updated_at,
      };
    });
  } catch { return null; }
}
