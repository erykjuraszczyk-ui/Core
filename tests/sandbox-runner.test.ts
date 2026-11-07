import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const launcher = await readFile(new URL("../sandbox-runner/run.sh", import.meta.url), "utf8");
const dockerfile = await readFile(new URL("../sandbox-runner/Dockerfile", import.meta.url), "utf8");
const runner = await readFile(new URL("../sandbox-runner/runner.mjs", import.meta.url), "utf8");
const contract = await readFile(new URL("../docs/SANDBOX_EXECUTION.md", import.meta.url), "utf8");

describe("isolated runner security contract", () => {
  it("requires gVisor and fails closed instead of falling back", () => {
    expect(launcher).toContain('"runsc"');
    expect(launcher).toContain("--runtime=runsc");
    expect(launcher).toContain("Brak fallbacku do runc");
  });

  it("sets explicit container isolation and resource limits", () => {
    for (const flag of [
      "--network=none", "--read-only", "--user=10001:10001",
      "--cap-drop=ALL", "--security-opt=no-new-privileges",
      "--pids-limit=32", "--memory=128m", "--memory-swap=128m",
      "--cpus=0.50", "--ipc=private", "--cgroupns=private",
      "--tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m",
    ]) expect(launcher).toContain(flag);
    expect(launcher).toContain("readonly");
    expect(launcher).toContain("--rm");
  });

  it("bounds the submitted artifact and execution duration", () => {
    expect(launcher).toContain("SIZE > 20000");
    expect(launcher).toContain("TIME_LIMIT > 10");
    expect(launcher).toContain('head -c 65536');
    expect(runner).toContain("source.length > 20_000");
    expect(runner).toContain('source.includes("\\0")');
  });

  it("does not enable package installation or mount host credentials", () => {
    expect(launcher).not.toMatch(/docker (?:exec|cp)\s/);
    expect(launcher).not.toContain("/var/run/docker.sock");
    expect(launcher).not.toContain("--privileged");
    expect(launcher).not.toContain("--network=host");
  });

  it("runs the runner as a non-root user with Node permission restrictions", () => {
    expect(dockerfile).toContain("USER 10001:10001");
    expect(dockerfile).toContain('"--permission"');
    expect(dockerfile).toContain('"--allow-fs-read=/workspace"');
    expect(dockerfile).toContain('"--allow-fs-write=/tmp"');
  });

  it("documents human review and the local-only boundary", () => {
    expect(contract).toContain("Human");
    expect(contract).toContain("No remote public execution API");
    expect(contract).toContain("No browser-triggered execution");
  });
});
