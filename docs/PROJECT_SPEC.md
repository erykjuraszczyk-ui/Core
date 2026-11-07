# CORTANA CORE — Project Specification

**Baseline:** v0.10.0 · **Primary client:** browser · **Default language:** Polish

## 1. Product definition

CORTANA is a modular browser-based AI agent with an interactive holographic presence. The target experience combines conversation, voice, visual perception, user-controlled memory, configurable communication style, and a governed improvement pipeline.

The project targets modern browsers on Windows, Linux, Android, and other systems. Device features are progressive enhancements; the core interface must remain usable without camera, microphone, or advanced graphics hardware.

## 2. Architecture

React/TypeScript and Three.js implement the browser experience. Cloudflare Pages Functions is the server boundary. Model calls, embedding generation, memory authorization, and privileged operations remain server-side.

Perception → Context Fusion → Policy Gate → Planning → Response / Action → Memory → Evaluation.

A model-generated tool call is never authorization. Consequential actions require a policy decision and, where applicable, explicit human approval.

## 3. Security and governance invariants

- Memory is opt-in and manually managed; chat transcripts are not automatically persisted.
- No secrets in frontend code or Git.
- No device capture without visible user action and browser permission.
- No generated code execution on production systems.
- No direct writes to protected production branches by the agent.
- No ability for the agent to weaken its own governance.
- All consequential actions must be auditable and reversible.
- Sandbox output is untrusted diagnostic data, not approval.

## 4. Release roadmap

| Version | Milestone |
|---|---|
| 0.1.0 | Browser foundation and hologram |
| 0.2.0 | Agent API and streaming conversation |
| 0.3.0 | Browser Voice Core |
| 0.4.0 | D1 Memory Core and user controls |
| 0.5.0 | Semantic retrieval and Vectorize adapter |
| 0.6.0 | Emotional and Personality Core |
| 0.7.0 | Curated feedback and evaluation loop |
| 0.8.0 | Governed change proposals and approval withdrawal |
| 0.9.0 | Code artifact intake and static preflight |
| 0.9.1 | Automated validator tests and CI quality gates |
| 0.10.0 | Experimental local isolated execution runner |

## 5. v0.10.0 — Isolated Execution Sandbox

### Implemented

- A dedicated runner image based on Node.js 22.
- A fixed entry point for one standalone JavaScript module.
- A local launcher that requires Docker's gVisor runsc runtime and refuses fallback to runc.
- Container controls: network disabled, read-only root, non-root user, all Linux capabilities dropped, no-new-privileges, bounded memory/CPU/PIDs, private IPC/cgroup namespace, small noexec temporary filesystem, read-only single-file artifact mount, automatic container removal.
- Bounded artifact size, wall-clock execution time, and captured output.
- A written execution contract and operator instructions.

### Not connected / not implemented

- No browser-triggered or remote execution API.
- No Cloudflare Pages execution; Pages Functions must not run arbitrary user code.
- No execution in GitHub Actions.
- No package installation, network, secret injection, repository checkout, source write-back, Git commit, PR merge, or deployment.
- No claim that container isolation is perfect or that a successful run proves code safe.

### Operational requirements

Use a dedicated patched Linux host. Docker daemon access is privileged and the launcher must remain a local operator tool, never an internet-facing endpoint. gVisor is mandatory and execution fails closed if unavailable.

Before production use, pin the runner image by digest, generate an SBOM, add adversarial integration tests, source-hash attestation, structured result records, and an independent threat-model review. Human review is required before any generated patch is applied.
