# CORTANA CORE

**CORTANA CORE v0.5.0 — Semantic Retrieval & Vector Memory Engine**

CORTANA is a browser-first, multi-platform AI agent project. v0.5.0 adds server-side embeddings and optional Cloudflare Vectorize semantic retrieval to the user-controlled D1 memory introduced in v0.4.0.

> Memory remains opt-in and manually managed. D1 is authoritative; vector search is an optional index. If embeddings or Vectorize are unavailable, bounded keyword retrieval remains available.

## Stack

React 19 · TypeScript · Vite 8 · Three.js · Cloudflare Pages Functions · D1 · Vectorize · OpenAI-compatible chat and embeddings APIs.

## Run locally

Requirements: Node.js 22.12+ and npm.

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

## Cloudflare Pages

- Build command: `npm run build`
- Build output: `dist`
- Pages Functions: `functions/`
- D1 binding: `CORTANA_DB`
- Vectorize binding: `CORTANA_VECTORIZE`

Configure provider credentials as server-side secrets only. Never commit account IDs, Cloudflare tokens, database credentials, or model API keys.

See [Project Specification](docs/PROJECT_SPEC.md), [Agent API](docs/AGENT_API.md), [Memory Core](docs/MEMORY_CORE.md), and [Semantic Retrieval setup](docs/SEMANTIC_RETRIEVAL.md).

## Engineering principles

1. No secrets in browser code or Git.
2. No camera or microphone capture without visible user action and browser permission.
3. No hidden collection of raw sensory data.
4. No autonomous production-code changes.
5. Proposed changes must be reviewable, tested, auditable, and reversible.
6. Memory must be inspectable, exportable, and deletable by the user.
7. Never present a simulated capability as a live integration.
