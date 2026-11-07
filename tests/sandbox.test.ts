import { describe, expect, it } from "vitest";
import { inspectCodeArtifact } from "../src/lib/sandbox";

const valid = {
  title: "Add safe formatter",
  target: "src/lib/formatter.ts",
  source: "export function formatLabel(value: string) { return value.trim(); }",
  testPlan: "Verify normal text, empty text, and surrounding whitespace.",
};

function check(input: typeof valid, id: string) {
  return inspectCodeArtifact(input).find((item) => item.id === id)?.passed;
}

describe("CORTANA code artifact preflight", () => {
  it("accepts a valid source-root path and complete metadata", () => {
    expect(inspectCodeArtifact(valid).every((item) => item.passed)).toBe(true);
  });

  it.each(["src/lib/a.ts", "functions/api/a.ts", "docs/guide.md"])(
    "allows target %s", (target) => {
      expect(check({ ...valid, target }, "path")).toBe(true);
    },
  );

  it.each([".env", "src/.env.local", "src/secrets/key.ts", "src/node_modules/pkg.ts", "dist/app.js", "../outside.ts"])(
    "rejects protected or out-of-scope target %s", (target) => {
      expect(check({ ...valid, target }, "path")).toBe(false);
    },
  );

  it("rejects missing or oversized source and incomplete test plans", () => {
    expect(check({ ...valid, source: "" }, "source")).toBe(false);
    expect(check({ ...valid, source: "x".repeat(20_001) }, "source")).toBe(false);
    expect(check({ ...valid, testPlan: "too short" }, "test-plan")).toBe(false);
  });

  it("rejects NUL bytes", () => {
    expect(check({ ...valid, source: "const x = '\u0000';" }, "text-only")).toBe(false);
  });

  it.each([
    ["eval(", "dynamic-code"],
    ["new Function(", "dynamic-code"],
    ["process.env", "process-access"],
    ["from 'node:fs'", "filesystem"],
    ["require('child_process')", "child-process"],
    ["fetch('/api')", "network-side-effect"],
  ])("blocks selected risky source pattern %s", (source, id) => {
    expect(check({ ...valid, source }, id)).toBe(false);
  });

  it("does not execute or evaluate submitted source during inspection", () => {
    const source = "globalThis.__cortanaPreflightExecuted = true;";
    inspectCodeArtifact({ ...valid, source });
    expect((globalThis as typeof globalThis & { __cortanaPreflightExecuted?: boolean }).__cortanaPreflightExecuted).toBeUndefined();
  });
});
