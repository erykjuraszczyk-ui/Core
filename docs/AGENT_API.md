# CORTANA CORE v0.2.0 — Agent API & Real AI Conversation Engine

## Scope

This milestone replaces the local fake reply with a server-mediated, streaming model connection using an OpenAI Chat Completions-compatible provider.

The browser sends only conversation messages to `POST /api/chat`. The server owns the system prompt, provider URL, model selection, and API credential. No provider secret is shipped to the client.

## Server configuration

Configure these values as Cloudflare Pages secrets/variables:

| Name | Type | Example / default |
|---|---|---|
| `CORTANA_LLM_API_KEY` | Secret | Provider API key |
| `CORTANA_LLM_MODEL` | Variable | `gpt-4o-mini` |
| `CORTANA_LLM_BASE_URL` | Variable | `https://api.openai.com/v1` |

The base URL may be changed to another trusted OpenAI-compatible endpoint. It must use HTTPS; plain HTTP is accepted only for localhost development. The browser cannot choose the provider URL or model.

Do not put secrets in `.env` files committed to Git, frontend variables, source code, or chat messages.

## Endpoint

### `POST /api/chat`

Request:

```json
{
  "messages": [
    { "role": "user", "content": "Cześć, CORTANA." }
  ]
}
```

Rules:
- JSON only.
- 1–20 messages.
- Roles limited to `user` and `assistant`.
- Last message must be from the user.
- Maximum 4,000 characters per message and 16,000 characters total.
- System prompt is server-owned and cannot be overridden by the browser.
- The endpoint streams Server-Sent Events from the configured provider.

Success: `200 text/event-stream`, OpenAI-compatible streaming chunks.

Errors: `400` invalid input, `403` origin rejected, `413` oversized request, `415` unsupported content type, `429` provider rate limit, `502` provider/network failure, `503` missing model secret.

## Security boundary

- Provider credentials are attached only by the Pages Function.
- Client cannot supply a provider URL, model name, system prompt, or tool call.
- Input is size-limited and role-validated.
- Cross-origin browser requests are rejected.
- Raw conversation content is not written to server logs or persistent memory by this endpoint.
- No function in this milestone can modify GitHub repositories or execute generated code.

## Current limitations

This is a provider adapter, not user authentication or persistent memory. Before exposing the endpoint publicly at scale, add an authenticated session boundary and durable rate limiting (for example, Cloudflare Turnstile plus a server-side session and a Durable Object or equivalent rate limiter). Provider account limits and costs remain controlled by the provider account owner.

## Local development

Vite serves the browser application but does not execute Cloudflare Pages Functions. To test the real chat endpoint, deploy to Cloudflare Pages or run the project through the Cloudflare Pages local runtime with the required secrets. In plain Vite mode, the chat API will be unavailable and the UI will report that clearly.
