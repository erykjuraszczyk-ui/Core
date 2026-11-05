type Env = {
  CORTANA_LLM_API_KEY?: string;
  CORTANA_LLM_MODEL?: string;
  CORTANA_DB?: unknown;
};

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const configured = Boolean(context.env.CORTANA_LLM_API_KEY);
  return new Response(JSON.stringify({
    service: "cortana-core",
    version: "0.4.0",
    status: "ok",
    stage: "memory-core",
    integrations: {
      languageModel: configured,
      persistentMemory: Boolean(context.env.CORTANA_DB),
      speechRecognition: "browser-api",
      speechSynthesis: "browser-api",
      vision: false,
      autonomousCodeChanges: false,
    },
    model: configured ? (context.env.CORTANA_LLM_MODEL || "gpt-4o-mini") : null,
    governance: { selfImprovement: "proposal-review-test-approval-rollback" },
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
