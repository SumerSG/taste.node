export interface ChatCompletionRequest {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  text: string;
  model: string;
  latencyMs: number;
}

export interface ModelAdapter {
  name: string;
  isAvailable: () => boolean;
  complete: (req: ChatCompletionRequest) => Promise<ChatCompletionResponse>;
}

/* ─── Simulated / fallback adapter ─── */

const simulatedAdapter: ModelAdapter = {
  name: "simulated",
  isAvailable: () => true,
  async complete(req) {
    const start = Date.now();
    // The simulated engine lives in useChatEngine.ts; this stub is for registry parity.
    const text =
      req.messages.find((m) => m.role === "user")?.content ?? "Tell me more.";
    return { text, model: "simulated", latencyMs: Date.now() - start };
  },
};

/* ─── OpenAI adapter ─── */

function openAiAdapter(model: string, apiKey: string): ModelAdapter {
  return {
    name: `openai/${model}`,
    isAvailable: () => !!apiKey,
    async complete(req) {
      const start = Date.now();
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: req.messages,
          temperature: req.temperature ?? 0.8,
          max_tokens: req.max_tokens ?? 256,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content ?? "",
        model: data.model ?? model,
        latencyMs: Date.now() - start,
      };
    },
  };
}

/* ─── Anthropic adapter ─── */

function anthropicAdapter(model: string, apiKey: string): ModelAdapter {
  return {
    name: `anthropic/${model}`,
    isAvailable: () => !!apiKey,
    async complete(req) {
      const start = Date.now();
      const system = req.messages.find((m) => m.role === "system")?.content ?? "";
      const messages = req.messages.filter((m) => m.role !== "system");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          system,
          messages,
          max_tokens: req.max_tokens ?? 256,
          temperature: req.temperature ?? 0.8,
        }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        text: data.content?.[0]?.text ?? "",
        model: data.model ?? model,
        latencyMs: Date.now() - start,
      };
    },
  };
}

/* ─── OpenRouter adapter ─── */

function openRouterAdapter(model: string, apiKey: string): ModelAdapter {
  return {
    name: `openrouter/${model}`,
    isAvailable: () => !!apiKey,
    async complete(req) {
      const start = Date.now();
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: req.messages,
          temperature: req.temperature ?? 0.8,
          max_tokens: req.max_tokens ?? 256,
        }),
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content ?? "",
        model: data.model ?? model,
        latencyMs: Date.now() - start,
      };
    },
  };
}

/* ─── Registry ─── */

const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY ?? "";
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY ?? "";
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY ?? "";

export const modelRegistry: ModelAdapter[] = [
  simulatedAdapter,
  openAiAdapter("gpt-4o-mini", OPENAI_KEY),
  openAiAdapter("gpt-4o", OPENAI_KEY),
  anthropicAdapter("claude-3-5-sonnet-20241022", ANTHROPIC_KEY),
  anthropicAdapter("claude-3-haiku-20240307", ANTHROPIC_KEY),
  openRouterAdapter("openrouter/auto", OPENROUTER_KEY),
];

export function getActiveModel(): ModelAdapter {
  return modelRegistry.find((m) => m.isAvailable()) ?? simulatedAdapter;
}
