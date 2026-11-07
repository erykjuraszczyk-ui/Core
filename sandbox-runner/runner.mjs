import { readFile } from "node:fs/promises";
import { ARTIFACT_PATH, validateArtifact } from "./validate.mjs";

const input = process.argv[2];
try {
  const bytes = await readFile(input || "");
  const validation = validateArtifact(input, bytes);
  if (!validation.ok) {
    console.error("Odmowa:", validation.message);
    process.exit(2);
  }
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  await import("data:text/javascript;base64," + Buffer.from(source, "utf8").toString("base64"));
} catch (error) {
  console.error("Wykonanie nie powiodło się:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
}
