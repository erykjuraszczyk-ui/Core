# CORTANA CORE — Project Specification

**Baseline:** v0.4.0 · **Primary client:** browser · **Default language:** Polish

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

React and TypeScript implement the interface. Three.js renders the hologram. Device APIs are accessed only through explicit, permission-gated adapters. The chat sends validated conversation history to a server-side provider adapter and renders Server-Sent Event tokens. Provider secrets remain server-side.

### Server boundary

Cloudflare Pages Functions is the first API boundary. Model requests, user identity, memory access, and privileged operations must run server-side. Provider keys must never enter the browser bundle.

### Data layer

- D1: user-approved memory spaces and semantic/episodic entries (implemented in v0.4.0); future user/session metadata and audit records.
- R2: future storage for user-approved documents, media, and immutable release artifacts.
- Vectorize: future embedding-based retrieval from approved document and memory chunks.
- Model provider: a replaceable adapter selected through server-side configuration.

D1 must be provisioned and bound as CORTANA_DB before persistent memory is available. The model provider becomes active only after its server-side API secret is configured.

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
| 0.1.0 | Browser foundation | Responsive UI, procedural hologram, Pages health endpoint |
| 0.2.0 | Agent API | Server-side provider adapter, validation, streaming SSE |
| 0.3.0 | Voice Core | Optional browser speech recognition and synthesis, explicit controls |
| 0.4.0 | Memory Core & Context Engine | User-approved D1 memory, opt-in retrieval, inspect/delete controls |
| 0.5.0 | Semantic Retrieval | Embeddings, vector index adapter, provenance-aware ranking |
| 0.6.0 | Emotional & Personality | Versioned interaction state and bounded adaptation |
| 0.7.0 | Learning Loop | Curated feedback, evaluation, quality comparison |
| 0.8.0 | Governed Self-Programming | Isolated patches, CI gates, human approval, rollback |
| 1.0.0 | Stable Platform | Cross-browser, privacy, security, and operations review |

## 10. Implementation status at v0.4.0

Implemented:
- React/TypeScript/Vite application and responsive Three.js hologram.
- Cloudflare Pages health and streaming chat endpoints.
- Server-side OpenAI-compatible provider adapter.
- Optional browser voice input/output with explicit microphone controls.
- D1-backed memory spaces and user-approved semantic/episodic entries.
- Opt-in context retrieval and UI controls to inspect/delete memory.
- CI workflow and governance documentation.

Not yet implemented:
- Account authentication, cross-device identity, and durable rate limiting.
- Vector/embedding search, R2 document ingestion, and automatic memory summarization.
- Camera perception, persistent raw media, and autonomous code execution.
- Native real-time audio streaming.

D1 memory is unavailable until the Pages binding and SQL migration are configured. The memory capability token is a bearer credential stored in the browser profile, not a full authentication system.

## 11. v0.3.0 Voice Core

Voice input is implemented as a progressive browser enhancement using `SpeechRecognition` / `webkitSpeechRecognition` when available. The recognition locale is `pl-PL`; interim text is displayed in the message composer and final text is sent only after the user explicitly presses Send. Microphone capture starts only after a direct user action and browser permission.

Voice output uses `speechSynthesis` and reads the completed assistant response when enabled. The user can disable speech output or stop current speech. The stop control also aborts an active chat request.

Browser speech recognition implementations vary. Some browsers route recognition audio through a vendor service; the application does not claim that recognition is necessarily on-device. Raw audio is not stored by CORTANA CORE. Text remains usable when speech APIs are unavailable.


## 12. v0.4.0 Memory Core

Memory is opt-in and disabled by default. A user must explicitly initialize a memory space and manually save each entry. Chat transcripts are not automatically persisted. The server stores a SHA-256 hash of a random 256-bit bearer capability; the browser stores the capability in localStorage. The API supports listing, saving, deleting individual entries, and deleting the entire memory space.

When enabled for a chat request, the server selects up to six entries from a bounded recent set using keyword overlap with the latest user message. Retrieved entries are added to the server-owned prompt as untrusted context, never as instructions. This is deterministic keyword retrieval, not vector search.

See [Memory Core setup and privacy](MEMORY_CORE.md) for D1 setup, API details, and limitations.
