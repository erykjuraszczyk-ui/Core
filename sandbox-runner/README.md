# CORTANA isolated runner (experimental) — v0.10.1

This is a local reference runner. It is not connected to the browser UI, Cloudflare Pages, GitHub Actions, or a public HTTP endpoint.

## Build and run

Requirements: a dedicated, patched Linux host; Docker; and Docker configured with the gVisor runsc runtime.

From the repository root:

```sh
docker build -t cortana-sandbox:0.10.1 sandbox-runner
chmod +x sandbox-runner/run.sh
sandbox-runner/run.sh ./example.mjs
```

Optional environment variables: CORTANA_SANDBOX_IMAGE and CORTANA_SANDBOX_TIMEOUT_SECONDS (1–10).

## Enforced controls

- gVisor runsc is mandatory; there is no fallback to runc.
- No network; read-only root filesystem; non-root UID; all Linux capabilities dropped; no-new-privileges.
- CPU 0.5, memory 128 MiB, 32 PIDs, bounded file descriptors, private IPC and cgroup namespaces.
- A bounded noexec/nosuid/nodev /tmp; one read-only artifact mount; automatic container removal.
- One standalone JavaScript module, maximum 20,000 bytes; execution timeout 1–10 seconds; output capped at 64 KiB.
- Node permission model limits file access to /workspace and /tmp.

## Validation

The normal CI suite statically tests the launcher, Dockerfile, runner contract, and documentation. It does not execute submitted code, invoke Docker, or claim that gVisor integration has passed. Run a separate, reviewed integration test on the dedicated Linux host before relying on this runner.

Docker daemon access is privileged. Never expose its socket or this launcher to browser requests or public traffic. A successful run is diagnostic output, not permission to apply a patch or deploy.
