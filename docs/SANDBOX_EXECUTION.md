# CORTANA CORE — Isolated Execution Contract (v0.10.1)

## Scope

This is an experimental local execution boundary for one standalone JavaScript artifact. It is not connected to the browser UI, Cloudflare Pages Functions, GitHub Actions, or a remote execution API.

## Request and resource contract

- One UTF-8 JavaScript module, 1–20,000 bytes.
- Fixed entry point: /workspace/artifact.mjs.
- Runtime image: cortana-sandbox:0.10.1; Node.js 22; gVisor runsc required.
- No dependency installation, network access, secret injection, repository checkout, or write-back.
- Time: 1–10 seconds; memory 128 MiB; CPU 0.5; PID limit 32; output maximum 64 KiB.

## Mandatory container controls

runsc, network=none, read-only root, non-root UID, cap-drop=ALL, no-new-privileges, PID/memory/CPU/file-descriptor bounds, private IPC/cgroup namespace, bounded noexec/nosuid/nodev tmpfs, read-only single-file bind mount, automatic container removal.

If gVisor is unavailable, execution must fail closed. Never silently fall back to the default runtime.

## Verification

CI performs static contract tests against the launcher, Dockerfile, runner entrypoint, and this document. CI does not execute submitted artifacts and does not prove container isolation. Actual gVisor integration testing must occur on a dedicated, patched Linux host before operational use.

## Trust and approval

Sandbox output is untrusted diagnostic data. Review it alongside the exact source and test plan. Execution does not imply approval. A separate human-authorized workflow is required for patch application, commit, PR merge, or deployment.

## Explicit non-goals

- No remote public execution API or browser-triggered execution.
- No secrets, credentials, host filesystem, Docker socket, or network access in the sandbox.
- No automatic source mutation, Git write, merge, or deployment.
- No claim that container isolation is perfect or that a successful run proves code safe.
