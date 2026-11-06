export type ChangeStatus = "proposed" | "validated" | "approved" | "rejected" | "rolled_back";
export type ChangeProposal = {
  id: string;
  title: string;
  description: string;
  target: string;
  createdAt: string;
  updatedAt: string;
  status: ChangeStatus;
  validationMessage?: string;
};

const STORAGE_KEY = "cortana.governance.change-proposals.v1";
const MAX_PROPOSALS = 50;
const ALLOWED_TARGET = /^(src|functions|docs)\/[a-zA-Z0-9_./-]+$/;
const FORBIDDEN_TARGET = /(^|\/)(\.env[^/]*|secrets?)(\/|$)|(^|\/)(dist|node_modules|\.git)(\/|$)/i;

export function readProposals(): ChangeProposal[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ChangeProposal =>
      !!item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.title === "string" &&
      typeof item.description === "string" && typeof item.target === "string" &&
      typeof item.createdAt === "string" && typeof item.updatedAt === "string" &&
      ["proposed", "validated", "approved", "rejected", "rolled_back"].includes(item.status)
    ).slice(-MAX_PROPOSALS);
  } catch { return []; }
}

function persist(items: ChangeProposal[]): ChangeProposal[] {
  const bounded = items.slice(-MAX_PROPOSALS);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded)); } catch { /* local registry is optional */ }
  return bounded;
}

export function createProposal(input: { title: string; description: string; target: string }): ChangeProposal[] {
  const now = new Date().toISOString();
  const proposal: ChangeProposal = {
    id: crypto.randomUUID(), title: input.title.trim(), description: input.description.trim(),
    target: input.target.trim(), createdAt: now, updatedAt: now, status: "proposed",
  };
  return persist([...readProposals(), proposal]);
}

export function validateProposal(id: string): ChangeProposal[] {
  return persist(readProposals().map((item) => {
    if (item.id !== id || item.status !== "proposed") return item;
    const valid = item.title.length >= 5 && item.title.length <= 120 &&
      item.description.length >= 20 && item.description.length <= 2000 &&
      ALLOWED_TARGET.test(item.target) && !FORBIDDEN_TARGET.test(item.target);
    return { ...item, status: valid ? "validated" : "proposed",
      validationMessage: valid ? "Metadane poprawne. Wymagany przegląd człowieka i testy." :
        "Sprawdź tytuł (5–120 znaków), opis (20–2000 znaków) i dozwoloną ścieżkę src/, functions/ lub docs/.",
      updatedAt: new Date().toISOString() };
  }));
}

export function transitionProposal(id: string, nextStatus: "approved" | "rejected" | "rolled_back"): ChangeProposal[] {
  const allowed: Record<"approved" | "rejected" | "rolled_back", ChangeStatus[]> = {
    approved: ["validated"], rejected: ["proposed", "validated"], rolled_back: ["approved"],
  };
  return persist(readProposals().map((item) => item.id === id && allowed[nextStatus].includes(item.status)
    ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() } : item));
}

export function clearProposals(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage may be unavailable */ }
}
