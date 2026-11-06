# CORTANA CORE

**CORTANA CORE v0.9.0 — Sandboxed Code Generation & Automated Testing**

CORTANA is a browser-first, multi-platform AI agent project. v0.7.0 adds explicit response ratings and a local, reviewable preference-adaptation loop on top of the v0.6.0 personality profile. Semantic memory from v0.5.0 remains available.

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


## Adaptive Learning & Feedback Engine (v0.7.0)

- Users can rate each completed assistant response as useful or needing improvement.
- Feedback is stored locally in the browser (up to 200 records); no transcript or feedback is sent to the model provider.
- The engine summarizes explicit ratings by the response personality style.
- A style recommendation appears only after at least three positive ratings for that style.
- Applying a recommendation requires an explicit user action; it updates the existing personality preference.
- Users can dismiss a recommendation and clear the local feedback register.
- This is preference adaptation, not model fine-tuning, autonomous code modification, or evidence of machine learning of model weights.


## Governed Self-Programming & Rollback Engine (v0.8.0)

- Users can create local change proposals with a title, target path, rationale, and test plan.
- A deterministic metadata validator accepts only paths under `src/`, `functions/`, or `docs/`; it rejects protected paths and malformed proposal metadata.
- State transitions are gated: proposed → validated → approved; proposals can also be rejected, and approval can be withdrawn.
- Approval means permission to hand a proposal to a human implementation/review workflow. It does not execute code, edit files, create commits, or deploy.
- The local proposal registry is capped at 50 records and can be cleared by the user.
- Source-code diffs, sandbox execution, GitHub automation, and true commit-level rollback are not part of this release.


## Sandboxed Code Generation & Automated Testing (v0.9.0)

- Local code-artifact workspace accepts a title, allowlisted target path, source text (maximum 20,000 characters), and a required test plan.
- Deterministic preflight checks validate metadata, path boundaries, text format, test-plan presence, and selected risky source patterns (dynamic evaluation, process/filesystem/child-process access, and direct network APIs).
- Each artifact stores an inspectable check report and source preview in browser localStorage (maximum 25 artifacts); users can clear the registry.
- A passing preflight means only that the configured static checks passed. It is not proof of correctness or security.
- Generated source is never evaluated, imported, executed, committed, or deployed by this release. No real OS/container sandbox or automated unit-test runner is connected yet.
- Human review and approval remain mandatory before any implementation workflow.
