# CORTANA CORE — Project Specification

**Baseline:** v0.6.0 · **Primary client:** browser · **Default language:** Polish

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
