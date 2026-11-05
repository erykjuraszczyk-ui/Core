# CORTANA CORE

**CORTANA CORE v0.1.0 — Browser Foundation**

CORTANA is a browser-first, multi-platform AI system project. This milestone establishes the holographic interface, application structure, API health endpoint, and governance for future learning and controlled self-improvement.

> This release is a visual and architectural foundation. It does not yet include a connected language model, persistent memory, live microphone processing, camera perception, or autonomous code deployment. The interface identifies these capabilities as not connected.

## Goals

- Interactive 3D hologram in desktop and mobile browsers.
- Polish-first conversation interface.
- Replaceable language, voice, vision, and memory adapters.
- User-controlled episodic and semantic memory.
- Learning from explicit feedback and curated knowledge.
- Governed self-improvement: proposal, isolated validation, approval, staged rollout, monitoring, rollback.
- Cross-platform access through modern browsers.

## Stack

React 19 · TypeScript · Vite 8 · Three.js · Cloudflare Pages Functions.

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

See [Project Specification](docs/PROJECT_SPEC.md).
