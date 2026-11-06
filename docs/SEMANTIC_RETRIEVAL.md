# CORTANA CORE v0.5.0 — Semantic Retrieval & Vector Memory

## Architecture

D1 remains the source of truth for memory entries and bearer-capability ownership. Cloudflare Vectorize is an optional semantic index. Each vector uses the D1 entry UUID as its Vectorize ID and includes a `spaceId` metadata field; every query is filtered by that space ID. Retrieved IDs are resolved back through D1 before their content can enter the model context. Stale or cross-space vector matches therefore cannot directly inject content.

Embeddings are requested server-side from the OpenAI-compatible `/embeddings` endpoint. No embedding API key or vector is exposed to the browser. The default model is `text-embedding-3-small` (1536 dimensions); the selected Vectorize index must use the exact same vector dimension and compatible metric.

## Cloudflare configuration

1. Keep the existing D1 binding named `CORTANA_DB` and apply `migrations/0001_memory.sql` if not already applied.
2. Create a Cloudflare Vectorize index with **1536 dimensions** and cosine distance when using the default embedding model.
3. In Pages → Settings → Functions → Vectorize bindings, bind that index as `CORTANA_VECTORIZE`.
4. Configure the existing server-side `CORTANA_LLM_API_KEY` secret. It must have permission to call both chat completions and embeddings.
5. Optionally set `CORTANA_EMBEDDING_MODEL` to a compatible embedding model. If changed, create/reconfigure the Vectorize index to match its output dimension.
6. Deploy the Pages project and check `GET /api/health`.

No vector index ID, provider secret, or account credential belongs in Git. Cloudflare dashboard bindings are environment configuration, not source code.

## Retrieval behavior

- On save/update, the server attempts to create and upsert an embedding.
- On chat, the server embeds the latest user message, queries up to 12 candidates filtered by the authenticated memory-space ID, resolves them through D1, and injects up to six records as untrusted context.
- If Vectorize is not bound, embedding generation is unavailable, or vector retrieval fails, the API falls back to the bounded v0.4 keyword retrieval.
- Existing D1 entries are not automatically backfilled. Edit and save an existing entry again to index it, or use a future controlled reindex job.
- The `vectorIndexed` field in a save response indicates whether the new record was indexed successfully.

## Privacy and limits

Memory remains opt-in, manually saved, inspectable, editable, exportable, and deletable. Chat transcripts are not automatically persisted. Vector metadata contains the memory-space ID, kind, and source; the full text remains in D1. The bearer token is still a capability rather than account authentication. Do not store passwords, API keys, financial credentials, or highly sensitive information.

Vector similarity is a relevance signal, not proof that a stored fact is current or true. Retrieved records remain untrusted data. No autonomous memory creation or deletion is introduced in this milestone.
