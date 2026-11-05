export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

type StreamHandlers = {
  onToken: (token: string) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
};

type StreamChunk = {
  choices?: Array<{
    delta?: { content?: string | Array<{ type?: string; text?: string }> };
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
};

function extractText(content: StreamChunk["choices"] extends Array<infer T> ? T extends { delta?: infer D } ? D extends { content?: infer C } ? C : never : never : never): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => typeof part.text === "string" ? part.text : "").join("");
  }
  return "";
}

export async function streamAgentReply(
  messages: AgentMessage[],
  handlers: StreamHandlers,
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
    body: JSON.stringify({ messages }),
    signal: handlers.signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error || `Błąd API (${response.status}).`);
  }
  if (!response.body) throw new Error("Dostawca nie zwrócił strumienia odpowiedzi.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const chunk = JSON.parse(data) as StreamChunk;
            if (chunk.error?.message) throw new Error(chunk.error.message);
            const token = extractText(chunk.choices?.[0]?.delta?.content);
            if (token) handlers.onToken(token);
          } catch (error) {
            if (error instanceof SyntaxError) continue;
            throw error;
          }
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
