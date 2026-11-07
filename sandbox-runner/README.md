# CORTANA isolated runner (experimental)

This directory is a local reference runner, not a production service and not yet connected to Cloudflare Pages or the browser UI.

## Security boundary

- Requires Docker with the gVisor runsc runtime. The launcher refuses to fall back to the default runc runtime.
- Executes one JavaScript module in a disposable container with no network, no secrets, no host credentials, no Docker socket, no capabilities, a non-root UID, a read-only root filesystem, bounded memory/CPU/PIDs, a small writable /tmp, and a 1–10 second wall-clock timeout.
- The submitted artifact is mounted read-only and limited to 20,000 bytes.
- Node's permission model further restricts filesystem access to /workspace and /tmp.
- Container output is truncated to 64 KiB by the launcher.

## Build and run

From the repository root:

```sh
docker build -t cortana-sandbox:0.10.0 sandbox-runner
chmod +x sandbox-runner/run.sh
sandbox-runner/run.sh ./example.mjs
```

Optional environment variables: CORTANA_SANDBOX_IMAGE and CORTANA_SANDBOX_TIMEOUT_SECONDS (1–10).

## Important operational caveats

1. Use a dedicated, patched Linux host. Do not run this on a machine containing sensitive user data.
2. Docker daemon access is highly privileged. The launcher is intended for a trusted local operator, not an HTTP endpoint. Never expose the Docker socket or this launcher to browser requests.
3. gVisor materially strengthens isolation but is not a mathematical proof of safety. Keep the host and runtime patched.
4. The launcher requires Bash and GNU timeout; validate it on the deployment host before use.
5. This runner is not wired into the app, does not install dependencies, and does not modify the repository. It executes only a standalone JavaScript artifact.
6. A successful run is diagnostic evidence, not approval to merge or deploy. Review output and source manually.

No arbitrary code is run in GitHub Actions or in the Cloudflare Pages production runtime.


## v0.10.1 input validation

The runner validates the raw artifact bytes before decoding: size is measured in bytes, UTF-8 decoding is fatal (invalid sequences are rejected), and NUL bytes are rejected. The contract is shared with unit tests.

The repository CI runs contract tests and Bash syntax validation only. It does not launch Docker or gVisor and must not be described as proof of container isolation.
