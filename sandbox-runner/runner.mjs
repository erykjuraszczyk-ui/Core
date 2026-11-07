import { readFile } from "node:fs/promises";
import { validateArtifactBytes } from "./contract.mjs";

const input = process.argv[2];
if (input !== "/workspace/artifact.mjs") {
  console.error("Odmowa: nieprawidłowa ścieżka artefaktu.");
  process.exit(2);
}

try {
  const bytes = await readFile(input);
  const validation = validateArtifactBytes(bytes);
  if (!validation.ok) {
    console.error("Odmowa: artefakt nie spełnia kontraktu wejściowego (" + validation.reason + ").");
    process.exit(2);
  }
  await import("data:text/javascript;base64," + Buffer.from(validation.source, "utf8").toString("base64"));
} catch (error) {
  console.error("Wykonanie nie powiodło się:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
}
