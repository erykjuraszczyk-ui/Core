export const MAX_ARTIFACT_BYTES = 20_000;

export function validateArtifactBytes(input) {
  if (!(input instanceof Uint8Array)) return { ok: false, reason: "input-not-bytes" };
  if (input.byteLength < 1 || input.byteLength > MAX_ARTIFACT_BYTES) {
    return { ok: false, reason: "size-out-of-range" };
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch {
    return { ok: false, reason: "invalid-utf8" };
  }
  if (source.includes("\0")) return { ok: false, reason: "nul-byte" };
  return { ok: true, source };
}
