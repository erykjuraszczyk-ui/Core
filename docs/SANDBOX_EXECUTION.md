# CORTANA CORE — Isolated Execution Contract (v0.10.0)

## Scope

v0.10.0 introduces an experimental local execution boundary for standalone JavaScript artifacts. It does not connect the browser UI, Cloudflare Pages Functions, or GitHub Actions to an execution service.

## Request contract

- Input: one UTF-8 JavaScript module, 1–20,000 bytes.
- Entry point: fixed path /workspace/artifact.mjs; callers cannot select commands, mounts, image names, environment variables, or runtime flags.
- Runtime: pinned local image cortana-sandbox:0.10.0, Node.js 22, gVisor runsc required.
- No dependency installation, network access, secret injection, repository checkout, or write-back.
- Time: configurable 1–10 seconds; memory 128 MiB; CPU 0.5; PID limit 32; output maximum 64 KiB.

## Mandatory container controls

runsc, network=none, read-only root, non-root UID, cap-drop=ALL, no-new-privileges, PID/memory/CPU/ulimit bounds, private IPC/cgroup namespace, bounded noexec tmpfs, read-only single-file bind mount, automatic container removal.

If gVisor is unavailable, execution must fail closed. Never silently fall back to the default container runtime.

## Trust and approval

The sandbox output is untrusted diagnostic data. It must be reviewed alongside the exact source hash and test plan. Execution does not imply approval. A separate human-authorized workflow is required for any patch application, commit, pull request merge, or deployment.

## Explicit non-goals

- No remote public execution API.
- No browser-triggered execution.
- No secrets, credentials, host filesystem, Docker socket, or network access in the sandbox.
- No automatic source mutation, Git write, merge, or deployment.
- No claim that container isolation is perfect or that a successful run proves code safe.

## Known limitation

The initial runner is experimental and local. Before production use, add a pinned image digest and software bill of materials, adversarial integration tests, structured result records, source SHA-256 attestation, and an independently reviewed threat model.
