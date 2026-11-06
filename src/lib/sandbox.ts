export type SandboxCheck = { id: string; label: string; passed: boolean; detail: string };
export type CodeArtifact = {
  id: string; title: string; target: string; source: string; testPlan: string;
  createdAt: string; checks: SandboxCheck[]; status: "draft" | "checks_passed" | "blocked";
};
const KEY = "cortana.sandbox.artifacts.v1";
const LIMIT = 25;
const MAX_SOURCE = 20_000;
const ALLOWED = /^(src|functions|docs)\/[a-zA-Z0-9_./-]+$/;
const FORBIDDEN_PATH = /(^|\/)(\.env[^/]*|secrets?)(\/|$)|(^|\/)(dist|node_modules|\.git)(\/|$)/i;
const RISK_PATTERNS: Array<[string, RegExp, string]> = [
  ["dynamic-code", /\beval\s*\(|\bnew\s+Function\s*\(/, "Wykryto dynamiczne wykonywanie kodu."],
  ["process-access", /\bprocess\s*\./, "Wykryto bezpośredni dostęp do process."],
  ["filesystem", /\b(require\s*\(\s*['"](?:node:)?fs['"]|from\s+['"](?:node:)?fs['"])/, "Wykryto import API systemu plików."],
  ["child-process", /child_process|node:child_process/, "Wykryto API uruchamiania procesów."],
  ["network-side-effect", /\b(fetch|WebSocket|EventSource)\s*\(/, "Wykryto bezpośrednie wywołanie sieciowe; wymaga osobnego przeglądu."],
];
export function inspectCodeArtifact(input: { title: string; target: string; source: string; testPlan: string }): SandboxCheck[] {
  const checks: SandboxCheck[] = [];
  const add = (id: string, label: string, passed: boolean, detail: string) => checks.push({ id, label, passed, detail });
  add("title", "Tytuł", input.title.trim().length >= 5 && input.title.trim().length <= 120, "Wymagane 5–120 znaków.");
  add("path", "Dozwolona ścieżka", ALLOWED.test(input.target.trim()) && !FORBIDDEN_PATH.test(input.target.trim()), "Dozwolone katalogi: src/, functions/, docs/. Pliki sekretów i katalogi generowane są blokowane.");
  add("source", "Rozmiar źródła", input.source.trim().length > 0 && input.source.length <= MAX_SOURCE, "Kod musi zawierać 1–20 000 znaków.");
  add("test-plan", "Plan testów", input.testPlan.trim().length >= 20 && input.testPlan.trim().length <= 2000, "Plan testów musi mieć 20–2000 znaków.");
  add("text-only", "Format tekstowy", !input.source.includes("\u0000"), "Artefakt musi być zwykłym tekstem UTF-8.");
  for (const [id, pattern, detail] of RISK_PATTERNS) {
    const found = pattern.test(input.source);
    add(id, "Kontrola: " + id, !found, found ? detail : "Nie wykryto wzorca w statycznym skanie.");
  }
  return checks;
}
export function createCodeArtifact(input: { title: string; target: string; source: string; testPlan: string }): CodeArtifact {
  const checks = inspectCodeArtifact(input);
  const passed = checks.every((check) => check.passed);
  return {
    id: crypto.randomUUID(), title: input.title.trim(), target: input.target.trim(),
    source: input.source, testPlan: input.testPlan.trim(), createdAt: new Date().toISOString(),
    checks, status: passed ? "checks_passed" : "blocked",
  };
}
export function readCodeArtifacts(): CodeArtifact[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is CodeArtifact => !!item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.title === "string" && typeof item.target === "string" &&
      typeof item.source === "string" && typeof item.testPlan === "string" &&
      Array.isArray(item.checks) && ["draft", "checks_passed", "blocked"].includes(item.status)
    ).slice(-LIMIT);
  } catch { return []; }
}
export function saveCodeArtifact(artifact: CodeArtifact): CodeArtifact[] {
  const next = [...readCodeArtifacts().filter((item) => item.id !== artifact.id), artifact].slice(-LIMIT);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* local drafts are optional */ }
  return next;
}
export function clearCodeArtifacts(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage may be unavailable */ }
}
