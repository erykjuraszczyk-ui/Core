# CORTANA CORE v0.4.0 — Memory Core & Context Engine

## What is implemented

- Cloudflare D1 relational storage for user-approved semantic and episodic memory entries.
- A browser-generated memory capability is issued by the server; only its SHA-256 hash is stored in D1.
- Memory is opt-in and disabled by default for each page session.
- The user explicitly writes and saves each memory entry. Chat transcripts are not automatically persisted.
- When memory is enabled, the chat endpoint retrieves up to six relevant entries using bounded keyword matching against the latest user message and adds them as untrusted context.
- Individual entries and the complete memory space can be deleted from the interface.
- Raw microphone audio and camera media are not stored.

## Cloudflare setup

1. Create a Cloudflare D1 database for this Pages project.
2. In Cloudflare Pages → Settings → Functions → D1 database bindings, add a binding named `CORTANA_DB` and select that database.
3. Apply the migration in `migrations/0001_memory.sql` using the Cloudflare D1 console or Wrangler:
   `npx wrangler d1 execute YOUR_DATABASE_NAME --remote --file=migrations/0001_memory.sql`
4. Redeploy the Pages project after adding the binding.

The binding is intentionally configured in the Pages dashboard rather than using a fake database ID in `wrangler.toml`. Never commit Cloudflare credentials or database secrets.

## API

All routes are same-origin Pages Functions. JSON responses use `Cache-Control: no-store`.

- `POST /api/memory` with `{"action":"initialize"}` creates a memory space and returns a 256-bit bearer capability once.
- `GET /api/memory` with `Authorization: Bearer <token>` lists up to 100 entries.
- `POST /api/memory` with bearer authorization and `{"action":"save","kind":"semantic","content":"...","tags":[]}` saves a user-approved entry.
- `DELETE /api/memory?id=<entry-id>` deletes one entry.
- `DELETE /api/memory` deletes the complete memory space.

The browser stores the bearer capability in localStorage. The server stores only its SHA-256 hash. Clearing browser storage without deleting the server-side space makes that space inaccessible; delete the memory space before clearing browser data when possible.

## Privacy and security boundaries

The token is a bearer capability, not a full login or account system. Anyone who obtains it can access that memory space. It is stored in the current browser profile's localStorage and is not protected against a compromised device, browser extensions, or same-origin script injection. Do not store passwords, API keys, financial credentials, or other highly sensitive data.

This milestone does not provide account recovery, cross-device synchronization, encryption-at-rest controlled by the user, authenticated user profiles, or durable rate limiting. Before a public multi-user deployment, add a proper authentication/session layer, CSRF protections appropriate to that session model, abuse controls/rate limiting, and an operational deletion/backup-retention policy.

Memory entries are user-controlled data, not instructions. Retrieved entries are explicitly marked as untrusted context in the server-owned system prompt. Retrieval is a simple bounded keyword ranking, not vector/embedding search. Vector search is a future adapter, not an implemented feature.

## Local development

Plain Vite does not execute Cloudflare Pages Functions or provide a D1 binding. Use the Cloudflare Pages local runtime with a local D1 database, or deploy a preview Pages environment with the binding configured. Without D1, the memory API returns HTTP 503 and text/voice chat remains usable when memory is disabled.
