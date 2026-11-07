# CORTANA CORE

**CORTANA CORE v0.10.0 — Isolated Execution Sandbox (experimental)**

CORTANA is a browser-first, multi-platform AI agent project. It combines a holographic interface, server-side model adapter, optional user-controlled memory, voice features, and a governed code-proposal workflow.

> Memory remains opt-in and manually managed. D1 is authoritative; vector search is an optional index.

## Stack

React 19 · TypeScript · Vite 8 · Three.js · Cloudflare Pages Functions · D1 · Vectorize · OpenAI-compatible APIs.

## Run locally

Requirements: Node.js 22.12+ and npm.

```sh
npm install
npm run dev
npm test
npm run build
```

## Cloudflare Pages

- Build command: npm run build
- Build output: dist
- Pages Functions: functions/
- D1 binding: CORTANA_DB
- Vectorize binding: CORTANA_VECTORIZE

Configure provider credentials as server-side secrets only. Never commit API keys or deployment credentials.

## Engineering principles

1. No secrets in frontend code or Git.
2. No camera or microphone capture without visible user action and browser permission.
3. No hidden collection of raw sensory data.
4. No autonomous production-code changes.
5. Proposed changes must be reviewable, tested, auditable, and reversible.
6. Memory must be inspectable, exportable, and deletable by the user.
7. Never present a simulated capability as a live integration.

## v0.10.0 — Isolated Execution Sandbox

- Adds an experimental local runner for a single standalone JavaScript artifact.
- Requires Docker with gVisor runsc; it fails closed if the runtime is unavailable.
- Applies no-network, read-only root, non-root UID, dropped capabilities, no-new-privileges, CPU/memory/PID/time/output limits, and a read-only artifact mount.
- The runner is not connected to the browser UI, Cloudflare Pages, GitHub Actions, or an HTTP API.
- It does not install packages, access secrets, write to the repository, create commits, merge PRs, or deploy.
- See docs/SANDBOX_EXECUTION.md and sandbox-runner/README.md.

A passing static check or sandbox run is not proof of safety. Human review and explicit approval remain mandatory.
