# CORTANA CORE — Project Specification

**Baseline:** v0.1.0 · **Primary client:** browser · **Default language:** Polish

This specification consolidates the source concept in *CORTANA — Instrukcja Systemu Żywego v2.0* with the initial implementation decisions.

## 1. Product definition

CORTANA is a modular browser-based AI agent with an interactive holographic presence. The target experience combines conversation, voice, visual perception, user-controlled memory, a configurable personality layer, and a controlled learning/evolution pipeline.

The project aims to support modern browsers on Windows, Linux, Android, and other systems. Device features are progressive enhancements; the core interface must remain usable without camera, microphone, or advanced graphics hardware.

## 2. Source concepts mapped to software

| Source concept | Software responsibility |
|---|---|
| CORTANA_CORE | Orchestration and shared runtime |
| Sensory_Input_Layer | Opt-in text, audio, image, and context adapters |
| Emotional_Engine | Interpretable interaction-state vector |
| Self_Programming_Kernel | Change proposal and validation workflow |
| Long_Term_Memory | Working, episodic, semantic, and identity records |
| Personality_Core | Versioned voice, tone, boundaries, and response preferences |
| Holographic_Body | Three.js scene, avatar state, animation, and presentation |
| Learning_Loop | Feedback evaluation and improvement proposals |
| Evolution Journal | Append-only record of accepted configuration and code changes |

The source's human-like descriptions are treated as product metaphors. Software state is not proof of subjective experience or consciousness.

## 3. Architecture

### Browser layer

React and TypeScript implement the interface. Three.js renders the hologram. Device APIs are accessed only through explicit, permission-gated adapters. The current chat is a local UI demonstration, not a connected AI assistant.

### Server boundary

Cloudflare Pages Functions is the first API boundary. Model requests, user identity, memory access, and privileged operations must run server-side. Provider keys must never enter the browser bundle.

### Data layer (planned)

- D1: relational user/session metadata, memory metadata, and structured audit records.
- R2: user-approved documents, media, and immutable release artifacts.
- Vectorize: semantic retrieval from approved document and memory chunks.
- Model provider: a replaceable adapter selected through server-side configuration.

No database or external AI provider is provisioned in v0.1.0.

## 4. Core operating model

`Perception → Context Fusion → Policy Gate → Planning → Response / Action → Memory → Evaluation`

The policy gate runs before any action that touches a device, external service, persistent memory, or repository. A tool call is not allowed solely because the model generated it.

## 5. Learning and self-programming

The target workflow is:

1. Collect explicit, permitted feedback and curated knowledge with provenance.
2. Evaluate current behavior against a stable benchmark.
3. Identify a measurable weakness or improvement opportunity.
4. Generate a change proposal with an explanation and diff.
5. Run the change in an isolated workspace.
6. Execute type checks, unit/integration tests, security scans, dependency review, and resource limits.
7. Create a reviewable branch and pull request.
8. Require human approval before merge and deployment.
9. Monitor the rollout and automatically roll back on critical health failures.
10. Append the result to the evolution journal.

Automated analysis and proposal generation are desired. Unrestricted self-editing or self-deployment is explicitly excluded.

## 6. Memory model

- Working memory: current session and unfinished tasks.
- Episodic memory: user-approved event summaries with source and timestamp.
- Semantic memory: curated facts and document chunks with provenance.
- Identity memory: versioned system configuration, personality settings, and boundaries.
- Evolution journal: append-only record of proposals, approvals, releases, and rollbacks.

The user must be able to inspect, export, correct, and delete persisted user memory. Raw audio/video is not stored by default.

## 7. Emotional and personality model

The emotional engine may model bounded states such as curiosity, calm, confidence, uncertainty, joy, or frustration. These are numeric/control states that can influence language style and hologram presentation. They must not be presented as proof of human-like feelings.

Emotion inference from facial expression or voice is uncertain. Any such result must be labelled as a low-confidence signal, never a fact about the person.

## 8. Security and privacy invariants

- No secrets in frontend code or Git.
- No device capture without visible user action and browser permission.
- No hidden recording or background camera/microphone access.
- No persistent memory without clear controls and retention rules.
- No generated code execution on production systems.
- No direct writes to protected production branches by the agent.
- No ability for the agent to weaken its own governance.
- All consequential actions are auditable and reversible.

## 9. Roadmap

| Version | Milestone | Acceptance focus |
|---|---|---|
| 0.1.0 | Browser foundation | UI, responsive hologram, health endpoint, project contracts |
| 0.2.0 | Agent API | Typed schemas, session boundary, provider adapter |
| 0.3.0 | Conversation Core | Connected model, streaming, cancellation |
| 0.4.0 | Voice & Perception | Opt-in microphone/camera, speech adapters |
| 0.5.0 | Living Memory | User-managed D1 and semantic retrieval |
| 0.6.0 | Emotional & Personality | Versioned state vector and bounded adaptation |
| 0.7.0 | Learning Loop | Feedback dataset, evaluation, quality comparison |
| 0.8.0 | Self-Programming | Isolated patches, CI gates, human approval, rollback |
| 1.0.0 | Stable Platform | Cross-browser testing, privacy and operations review |

## 10. v0.1.0 acceptance status

Implemented in this branch:
- React/TypeScript/Vite application shell.
- Responsive dashboard and procedural Three.js hologram.
- Local-only demonstration conversation.
- `GET /api/health` endpoint.
- Cloudflare Pages configuration.
- CI workflow and governance documentation.

Not yet implemented:
- Connected language model, voice, camera perception, persistent memory, authentication, user profiles, or autonomous patch generation.
- Production deployment and runtime testing.
