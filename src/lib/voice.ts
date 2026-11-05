export type RecognitionAlternative = { transcript: string };
export type RecognitionResult = {
  isFinal: boolean;
  0: RecognitionAlternative;
};
export type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
export type RecognitionErrorEvent = { error: string };

export interface CortanaSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => CortanaSpeechRecognition;

export function createSpeechRecognition(): CortanaSpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  if (!Constructor) return null;
  const recognition = new Constructor();
  recognition.lang = "pl-PL";
  recognition.continuous = false;
  recognition.interimResults = true;
  return recognition;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function speakText(text: string, onEnd?: () => void): boolean {
  if (!isSpeechSynthesisSupported() || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pl-PL";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.onend = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}
