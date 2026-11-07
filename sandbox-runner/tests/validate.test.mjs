import test from "node:test";
import assert from "node:assert/strict";
import { ARTIFACT_PATH, MAX_ARTIFACT_BYTES, validateArtifact } from "../validate.mjs";

const encode = (value) => new TextEncoder().encode(value);

test("accepts a small valid UTF-8 artifact at the fixed path", () => {
  assert.equal(validateArtifact(ARTIFACT_PATH, encode("export const answer = 42;")).ok, true);
});

test("rejects caller-selected paths", () => {
  for (const path of ["/tmp/payload.mjs", "/workspace/../etc/passwd", "artifact.mjs", ""]) {
    assert.equal(validateArtifact(path, encode("export {};")).code, "INVALID_PATH");
  }
});

test("rejects empty and oversized artifacts by byte length", () => {
  assert.equal(validateArtifact(ARTIFACT_PATH, new Uint8Array()).code, "SIZE_LIMIT");
  assert.equal(validateArtifact(ARTIFACT_PATH, new Uint8Array(MAX_ARTIFACT_BYTES + 1)).code, "SIZE_LIMIT");
});

test("accepts the exact byte limit", () => {
  assert.equal(validateArtifact(ARTIFACT_PATH, new Uint8Array(MAX_ARTIFACT_BYTES)).ok, true);
});

test("rejects NUL bytes", () => {
  assert.equal(validateArtifact(ARTIFACT_PATH, encode("const value = 1;\0")).code, "NUL_BYTE");
});

test("rejects malformed UTF-8 instead of silently replacing bytes", () => {
  assert.equal(validateArtifact(ARTIFACT_PATH, new Uint8Array([0xc3, 0x28])).code, "INVALID_UTF8");
});

test("rejects non-byte input", () => {
  assert.equal(validateArtifact(ARTIFACT_PATH, "export {};").code, "INVALID_BYTES");
});
