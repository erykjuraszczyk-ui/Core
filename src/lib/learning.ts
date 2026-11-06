import type { PersonalityStyle } from "./emotion";

export type FeedbackRating = "positive" | "negative";
export type FeedbackRecord = {
  id: string;
  messageId: number;
  rating: FeedbackRating;
  style: PersonalityStyle;
  createdAt: string;
};

const STORAGE_KEY = "cortana.learning.feedback.v1";
const MAX_RECORDS = 200;

export function readFeedback(): FeedbackRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FeedbackRecord =>
      !!item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.messageId === "number" &&
      (item.rating === "positive" || item.rating === "negative") &&
      ["balanced", "analytical", "warm", "concise"].includes(item.style) &&
      typeof item.createdAt === "string"
    ).slice(-MAX_RECORDS);
  } catch { return []; }
}

export function saveFeedback(record: FeedbackRecord): FeedbackRecord[] {
  const next = [...readFeedback().filter((item) => item.messageId !== record.messageId), record].slice(-MAX_RECORDS);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* local feedback is optional */ }
  return next;
}

export function clearFeedback(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage may be unavailable */ }
}

export function getLearningInsight(records: FeedbackRecord[]): {
  total: number; positive: number; negative: number; recommendedStyle: PersonalityStyle | null;
} {
  const positive = records.filter((item) => item.rating === "positive");
  const counts = new Map<PersonalityStyle, number>();
  for (const item of positive) counts.set(item.style, (counts.get(item.style) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const recommendedStyle = ranked[0] && ranked[0][1] >= 3 ? ranked[0][0] : null;
  return { total: records.length, positive: positive.length, negative: records.length - positive.length, recommendedStyle };
}
