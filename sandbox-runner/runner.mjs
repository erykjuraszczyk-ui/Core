import { readFile } from "node:fs/promises";

const input = process.argv[2];
if (input !== "/workspace/artifact.mjs") {
  console.error("Odmowa: nieprawidłowa ścieżka artefaktu.");
  process.exit(2);
}

try {
  const source = await readFile(input, "utf8");
  if (source.length < 1 || source.length > 20_000 || source.includes("\0")) {
    console.error("Odmowa: artefakt musi mieć 1–20 000 znaków i nie może zawierać bajtów NUL.");
    process.exit(2);
  }
  await import("data:text/javascript;base64," + Buffer.from(source, "utf8").toString("base64"));
} catch (error) {
  console.error("Wykonanie nie powiodło się:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
}
