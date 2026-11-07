# CORTANA CORE — Project Specification

**Baseline:** v0.10.1 · **Primary client:** browser · **Default language:** Polish

This specification consolidates the source concept in *CORTANA — Instrukcja Systemu Żywego v2.0* with the initial implementation decisions.

## 1. Product definition

CORTANA is a modular browser-based AI agent with an interactive holographic presence. The target experience combines conversation, voice, visual perception, user-controlled memory, a configurable personality layer, and a controlled learning/evolution pipeline.

The project aims to support modern browsers on Windows, Linux, Android, and other systems. Device features are progressive enhancements; the core interface must remain usable without camera, microphone, or advanced graphics hardware.

## 2. Architecture and operating model

React/TypeScript and Three.js implement the browser experience. Cloudflare Pages Functions is the server boundary. Model calls, embedding generation, memory authorization, and privileged operations remain server-side.

`Perception → Context Fusion → Policy Gate → Planning → Response / Action → Memory → Evaluation`

The policy gate runs before actions touching devices, external services, persistent memory, or repositories. A model-generated tool call is not authorization.

## 3. Memory architecture

- **D1:** authoritative store for memory spaces, bearer-token hashes, and semantic/episodic entries.
- **Vectorize:** optional semantic index keyed by D1 entry UUID; metadata is scoped by memory-space ID.
- **Embedding provider:** OpenAI-compatible server-side `/embeddings` endpoint, configured with the existing server-side provider secret.
- **Keyword fallback:** bounded v0.4 retrieval remains active if vector configuration or embedding calls are unavailable.

Vector results are never trusted as content. Candidate IDs are resolved through D1 using the current authorized memory-space ID before records are included in model context.

## 4. v0.5.0 retrieval flow

1. The user explicitly enables memory for the current page session.
2. The server validates the memory bearer capability against D1.
3. The latest user message is embedded server-side.
4. Vectorize searches only vectors whose `spaceId` metadata matches the authorized space.
5. Up to 12 candidate IDs are resolved through D1; at most six records are added to the model context.
6. Retrieved entries are labelled as user-approved but untrusted context.
7. If semantic retrieval cannot run, the server uses the bounded keyword retriever.

On save/update, the server attempts to upsert the embedding. Vector indexing failure does not discard the D1 memory record. Existing records require an edit/resave or a future reindex operation to receive vectors.

## 5. Privacy, governance, and security invariants

- Memory is opt-in and manually managed; chat transcripts are not automatically persisted.
- Users can inspect, edit, export, and delete memory.
- No secrets in frontend code or Git.
- No device capture without visible user action and browser permission.
- No generated code execution on production systems.
- No direct writes to protected production branches by the agent.
- No ability for the agent to weaken its own governance.
- All consequential actions are auditable and reversible.

The memory bearer token remains a capability, not a full account-authentication system. Do not store credentials or highly sensitive information.

## 6. Roadmap

| Version | Milestone |
|---|---|
| 0.1.0 | Browser foundation and hologram |
| 0.2.0 | Agent API and streaming conversation |
| 0.3.0 | Browser Voice Core |
| 0.4.0 | D1 Memory Core and user controls |
| 0.5.0 | Semantic retrieval, embeddings, Vectorize adapter, keyword fallback |
| 0.6.0 | Emotional and personality state model |
| 0.7.0 | Curated feedback and evaluation loop |
| 0.8.0 | Governed self-programming with approval and rollback |
| 0.9.0 | Code artifact preflight, static risk checks, and test-plan capture |
| 0.9.1 | Automated unit tests and pull-request quality gates for the preflight validator |
| 0.10.0 | Experimental local isolated execution runner |
| 0.10.1 | Byte-level artifact validation and sandbox runner contract tests |
| 1.0.0 | Stable cross-platform platform |

## 7. Implementation status at v0.5.0

Implemented in source:
- Browser application, Three.js hologram, streaming chat, and optional browser voice.
- D1-backed, user-managed semantic/episodic memory.
- Server-side embedding adapter and optional Cloudflare Vectorize integration.
- Space-scoped vector queries resolved through D1.
- Keyword fallback when semantic retrieval is unavailable.
- Health endpoint reports vector binding readiness.

Requires deployment configuration:
- D1 binding `CORTANA_DB` and migration `0001_memory.sql`.
- Vectorize binding `CORTANA_VECTORIZE` with dimension matching the embedding model.
- Server-side `CORTANA_LLM_API_KEY` with embedding endpoint access.

Not implemented:
- Automatic backfill/reindex of existing entries.
- Account authentication, cross-device identity, durable rate limiting.
- Automatic memory summarization, R2 document ingestion, camera perception, autonomous code execution.
- Native real-time audio streaming.

Software state and retrieval behavior are not evidence of subjective experience or consciousness.


## 8. v0.6.0 Emotional & Personality Core

- Personality profile is a user-selected enum: balanced, analytical, warm, concise.
- Interaction cues are neutral, curious, supportive, focused, positive, and calm.
- A local keyword heuristic selects a cue from the current message. It is a presentation hint, not a claim about the user's actual emotional state.
- The server validates both values against fixed allowlists before adding communication guidance to the model context.
- The selected personality is stored in browser localStorage; it is not part of long-term memory and does not grant tool permissions.
- The hologram receives the cue as a visual presentation state.
- No facial analysis, voice emotion inference, psychological profiling, or autonomous personality rewriting is implemented.


## 9. v0.7.0 Adaptive Learning & Feedback Engine

- Every completed assistant response can receive an explicit positive or negative rating.
- Feedback records are stored in browser localStorage, capped at 200, and can be cleared by the user.
- Records contain response ID, rating, personality style used, and timestamp; they do not store message text.
- The evaluator counts ratings and proposes a personality-style preference only after at least three positive ratings for the same style.
- The user must explicitly approve a proposed style change. Dismissal does not change settings.
- Feedback is not transmitted to the chat API and does not fine-tune model weights.
- This release does not introduce autonomous code generation, self-modification, or production deployment.


## 10. v0.8.0 Governed Self-Programming & Rollback Engine

- The UI supports user-authored change proposals with title, target path, rationale, and test plan.
- Proposal metadata is stored locally, capped at 50 records, and can be cleared.
- Deterministic validation checks required field lengths and restricts target paths to `src/`, `functions/`, or `docs/`; protected directories and secret-file paths are rejected.
- Allowed state transitions are proposed → validated → approved, proposed/validated → rejected, and approved → rolled_back (withdrawal of approval).
- Approval is not execution authorization. It records human permission to hand a proposal to a separate implementation and review workflow.
- No source file is edited by this engine; no generated code is executed; no commit or deployment is created.
- The v0.8.0 rollback action withdraws proposal approval only. It does not revert a Git commit or restore deployed code.
- A future release may add isolated patch generation, test execution in an ephemeral sandbox, signed artifacts, human review, and commit-level rollback.


## 11. v0.9.0 Sandboxed Code Generation & Automated Testing

- The browser provides a bounded code-artifact intake form: title, target path, source text, and a human-authored test plan.
- Static preflight checks enforce the existing source roots (src/, functions/, docs/), reject protected path patterns, cap source size at 20,000 characters, require a test plan, and scan for selected high-risk APIs.
- Results are stored locally, capped at 25 artifacts, and remain inspectable and deletable by the user.
- Passing checks are a preliminary static gate only. Pattern scans can produce false positives and false negatives; they do not parse or prove program behavior.
- This release does not execute untrusted code. A true sandbox runner (ephemeral container/VM, no secrets, deny-by-default network, CPU/memory/time limits, read-only base image) and automated unit-test execution are not yet connected. The UI explicitly discloses this limitation.
- No source write, Git commit, PR merge, or deployment occurs from the artifact workspace. Any later execution service must return logs and a diff for human review before a separately authorized implementation step.


## 12. v0.9.1 Automated Preflight Test Gates

- Vitest tests cover allowed paths, protected paths, required metadata, source size, NUL-byte rejection, and selected risk-pattern detection.
- Pull requests run dependency installation, the unit-test suite, and the normal production build/typecheck in GitHub Actions.
- CI tests the trusted validator source only. User-submitted artifact text is never passed to a shell, test runner, dynamic import, or evaluator.
- Workflow token permissions are read-only. This gate does not publish, deploy, merge, or write repository content.
- A green test suite is evidence for the tested cases, not proof that the static scanner is complete or that arbitrary code is safe.


## 13. v0.10.0 Isolated Execution Sandbox

- Adds an experimental local runner for one standalone JavaScript module.
- The launcher requires Docker with the gVisor runsc runtime and refuses fallback to runc.
- Container controls include network isolation, read-only root filesystem, non-root UID, dropped Linux capabilities, no-new-privileges, bounded memory/CPU/PIDs/time/output, private IPC/cgroup namespace, bounded noexec temporary storage, and a read-only single-file artifact mount.
- No dependency installation, secret injection, repository checkout, browser-triggered execution, remote execution API, Cloudflare Pages execution, GitHub Actions execution, source write-back, Git commit, PR merge, or deployment is included.
- The runner is a local operator tool only. Docker daemon access is privileged; never expose its socket or launcher to browser or public HTTP traffic.
- Sandbox output is untrusted diagnostic data. Human review is mandatory before any patch is applied.
- Production use still requires a dedicated patched host, pinned image digest, SBOM, adversarial integration tests, source-hash attestation, and independent threat-model review.


## 14. v0.10.1 Sandbox Preflight Hardening

- Extracts deterministic byte-level artifact validation into a separate trusted module.
- Enforces the fixed artifact path, 1–20,000 byte size, absence of NUL bytes, and strict UTF-8 decoding.
- Adds Node.js built-in test coverage for valid input, path traversal attempts, byte boundaries, NUL bytes, malformed UTF-8, and invalid input types.
- CI runs the sandbox contract tests and validates launcher shell syntax. These tests do not execute submitted artifacts.
- Launcher captures output to a temporary host file before truncating display, avoiding a pipe-to-head truncation race; it applies a bounded timeout with a kill-after grace period.
- This remains an experimental local runner. Runtime-level adversarial tests with Docker and gVisor are still required and have not been represented as passed.
