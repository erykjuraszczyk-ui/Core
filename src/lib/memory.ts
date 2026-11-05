export type MemoryEntry = {
  id: string;
  kind: "semantic" | "episode";
  content: string;
  tags: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
};

const TOKEN_KEY = "cortana.memory.token.v1";

export function readMemoryToken(): string | null {
  try { return window.localStorage.getItem(TOKEN_KEY); }
  catch { return null; }
}

export function storeMemoryToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearMemoryToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `Błąd pamięci (${response.status}).`);
  return data;
}

export async function initializeMemory(): Promise<string> {
  const result = await request<{ token: string }>("/api/memory", undefined, {
    method: "POST",
    body: JSON.stringify({ action: "initialize" }),
  });
  return result.token;
}

export async function listMemories(token: string): Promise<MemoryEntry[]> {
  const result = await request<{ entries: MemoryEntry[] }>("/api/memory", token);
  return result.entries;
}

export async function saveMemory(token: string, content: string, kind: MemoryEntry["kind"]): Promise<MemoryEntry> {
  const result = await request<{ entry: MemoryEntry }>("/api/memory", token, {
    method: "POST",
    body: JSON.stringify({ action: "save", content, kind }),
  });
  return result.entry;
}

export async function deleteMemory(token: string, id?: string): Promise<void> {
  const path = id ? `/api/memory?id=${encodeURIComponent(id)}` : "/api/memory";
  await request<{ deleted: boolean }>(path, token, { method: "DELETE" });
}
