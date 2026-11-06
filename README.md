# CORTANA CORE

**CORTANA CORE v0.6.0 — Emotional & Personality Core**

CORTANA is a browser-first, multi-platform AI agent project. v0.6.0 adds a local, user-configurable personality profile and lightweight interaction-state cues. Semantic memory from v0.5.0 remains available.

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


## Emotional & Personality Core (v0.6.0)

- Four selectable response styles: balanced, analytical, warm, concise.
- Six interaction cues: neutral, curious, supportive, focused, positive, calm.
- Cue classification is a lightweight heuristic over the current user message, not emotion recognition or diagnosis.
- The selected style is stored locally in the browser; it is sent as a validated enum and never grants additional permissions.
- Hologram presentation responds to the current interaction cue.
- No emotion inference from camera, voice biometrics, or hidden behavioral profiling.
