# CORTANA CORE

**CORTANA CORE v0.4.0 — Memory Core & Context Engine**

CORTANA is a browser-first, multi-platform AI system project. This milestone adds a server-side, OpenAI-compatible streaming conversation API to the browser foundation.

> This milestone adds opt-in, user-managed persistent memory on Cloudflare D1 and bounded context retrieval. The model provider still requires a server-side secret. Camera perception and autonomous code deployment are not connected. Voice uses browser speech APIs where supported.

## Goals

- Interactive 3D hologram in desktop and mobile browsers.
- Polish-first conversation interface.
- Replaceable language, voice, vision, and memory adapters.
- User-controlled episodic and semantic memory.
- Learning from explicit feedback and curated knowledge.
- Governed self-improvement: proposal, isolated validation, approval, staged rollout, monitoring, rollback.
- Cross-platform access through modern browsers.

## Stack

React 19 · TypeScript · Vite 8 · Three.js · Cloudflare Pages Functions · OpenAI-compatible streaming API.

Cloudflare D1, R2, and Vectorize are planned integration targets; they are not provisioned by this commit.

## Run locally

Requirements: Node.js 22.12+ and npm.

```bash
npm install
npm run dev
```

Verify and build:

```bash
npm run typecheck
npm run build
npm run preview
```

## Cloudflare Pages

Connect this GitHub repository to a Pages project:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Pages Functions: `functions/`

The repository includes `wrangler.toml`. Do not commit Cloudflare tokens, account IDs, model keys, or database credentials.

## Repository map

- `src/` — browser interface and procedural 3D hologram
- `functions/api/` — server-side API
- `docs/PROJECT_SPEC.md` — architecture, evolution governance, security, and roadmap
- `.github/workflows/` — CI

## Engineering principles

1. No secrets in browser code or Git.
2. No camera or microphone capture without a visible user action and browser permission.
3. No hidden collection of raw sensory data.
4. No autonomous production-code changes.
5. Proposed changes must be reviewable, tested, auditable, and reversible.
6. Memory must be inspectable, exportable, and deletable by the user.
7. Never present a simulated capability as a live integration.

The product concept follows the user's **CORTANA — Instrukcja Systemu Żywego v2.0**: sensory input, emotional state model, personality core, holographic body, learning loop, layered memory, and evolution journal. These are implemented as software modules and state models, not as claims of biological life or consciousness.

See [Project Specification](docs/PROJECT_SPEC.md), [Agent API](docs/AGENT_API.md), and [Memory Core setup and privacy](docs/MEMORY_CORE.md).

## Voice Core v0.3.0

- Polish speech recognition through the browser Web Speech API where supported.
- Speech synthesis for completed assistant responses.
- Explicit microphone start/stop controls, voice-output toggle, and stop action.
- The browser requests microphone permission when the user starts listening. Recognition support and processing behavior depend on the browser; some implementations may send audio to a browser/vendor speech service.
- CORTANA CORE does not persist raw microphone audio. Recognition text becomes a normal chat message only after the user presses Send.
- Voice is an optional enhancement; text chat remains available on unsupported browsers.


## Memory Core v0.4.0

- Opt-in memory; disabled by default and never populated from chat automatically.
- Explicit user-approved semantic and episodic entries stored in Cloudflare D1.
- Relevant entries are retrieved into the server-side chat context only while memory is enabled.
- Users can inspect entries, delete individual entries, or erase the entire memory space.
- A random bearer capability is stored in the browser profile; it is not a replacement for account authentication. Do not save highly sensitive information.
- Retrieval uses bounded keyword matching. Embedding/vector search is not implemented in this milestone.

See [Memory Core setup and privacy](docs/MEMORY_CORE.md) before configuring a D1 binding.
