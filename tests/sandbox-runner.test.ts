import { describe, expect, it } from "vitest";
import { validateArtifactBytes, MAX_ARTIFACT_BYTES } from "../sandbox-runner/contract.mjs";

const bytes = (value: string) => new TextEncoder().encode(value);

describe("isolated runner input contract", () => {
  it("accepts a small valid UTF-8 module", () => {
    expect(validateArtifactBytes(bytes("export const answer = 42;"))).toMatchObject({
      ok: true,
      source: "export const answer = 42;",
    });
  });

  it("rejects empty input and artifacts above the byte limit", () => {
    expect(validateArtifactBytes(bytes(""))).toMatchObject({ ok: false, reason: "size-out-of-range" });
    expect(validateArtifactBytes(bytes("x".repeat(MAX_ARTIFACT_BYTES + 1)))).toMatchObject({
      ok: false,
      reason: "size-out-of-range",
    });
  });

  it("measures UTF-8 bytes, not JavaScript UTF-16 code units", () => {
    expect(validateArtifactBytes(bytes("ą".repeat(10_001))).reason).toBe("size-out-of-range");
  });

  it("rejects malformed UTF-8 and NUL bytes", () => {
    expect(validateArtifactBytes(new Uint8Array([0xc3, 0x28]))).toMatchObject({
      ok: false,
      reason: "invalid-utf8",
    });
    expect(validateArtifactBytes(new Uint8Array([0x61, 0x00, 0x62]))).toMatchObject({
      ok: false,
      reason: "nul-byte",
    });
  });

  it("rejects values that are not byte arrays", () => {
    expect(validateArtifactBytes("console.log('no')")).toMatchObject({
      ok: false,
      reason: "input-not-bytes",
    });
  });
});
