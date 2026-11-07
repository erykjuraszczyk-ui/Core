export const MAX_ARTIFACT_BYTES = 20_000;
export const ARTIFACT_PATH = "/workspace/artifact.mjs";

export function validateArtifact(inputPath, bytes) {
  if (inputPath !== ARTIFACT_PATH) {
    return { ok: false, code: "INVALID_PATH", message: "Nieprawidłowa ścieżka artefaktu." };
  }
  if (!(bytes instanceof Uint8Array)) {
    return { ok: false, code: "INVALID_BYTES", message: "Artefakt musi być przekazany jako bajty." };
  }
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_ARTIFACT_BYTES) {
    return { ok: false, code: "SIZE_LIMIT", message: "Artefakt musi mieć 1–20 000 bajtów." };
  }
  if (bytes.includes(0)) {
    return { ok: false, code: "NUL_BYTE", message: "Artefakt zawiera niedozwolony bajt NUL." };
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, code: "INVALID_UTF8", message: "Artefakt nie jest poprawnym tekstem UTF-8." };
  }
  return { ok: true, code: "OK", message: "Artefakt przeszedł kontrolę wejściową." };
}
