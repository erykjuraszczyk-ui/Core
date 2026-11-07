export const MAX_ARTIFACT_BYTES: number;
export function validateArtifactBytes(input: Uint8Array):
  | { ok: true; source: string }
  | { ok: false; reason: string };
