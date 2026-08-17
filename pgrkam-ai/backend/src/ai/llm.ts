import { Logger } from "@nestjs/common";

export type ChatTurn = {
  role: "system" | "user" | "assistant";
  content: string;
};

type Provider = {
  name: string;
  url: string;
  apiKey?: string;
  models: string[];
};

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function providers(): Provider[] {
  const groqKey = env("GROQ_API_KEY");
  const openaiKey = env("OPENAI_API_KEY");
  const ollamaBase = (env("OLLAMA_BASE_URL") || "http://127.0.0.1:11434/v1").replace(/\/$/, "");
  const ollamaModel = env("OLLAMA_MODEL");
  const prefer = env("CHAT_PROVIDER")?.toLowerCase();

  const list: Provider[] = [];
  if (groqKey) {
    list.push({
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: groqKey,
      models: [
        env("GROQ_MODEL") || "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile",
        "openai/gpt-oss-20b",
      ].filter((model, index, all) => all.indexOf(model) === index),
    });
  }
  if (openaiKey) {
    list.push({
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: openaiKey,
      models: [env("OPENAI_MODEL") || "gpt-4o-mini"],
    });
  }
  if (ollamaModel || prefer === "ollama") {
    list.push({
      name: "ollama",
      url: `${ollamaBase}/chat/completions`,
      models: [ollamaModel || "llama3.2"],
    });
  }

  if (!prefer) return list;
  return [...list.filter((item) => item.name === prefer), ...list.filter((item) => item.name !== prefer)];
}

export function hasChatLlm(): boolean {
  return providers().length > 0;
}

export async function completeChat(input: {
  messages: ChatTurn[];
  temperature?: number;
  json?: boolean;
  logger?: Logger;
}): Promise<string | null> {
  const available = providers();
  if (!available.length) {
    input.logger?.warn("No chat LLM configured (set GROQ_API_KEY, OPENAI_API_KEY, or OLLAMA_MODEL).");
    return null;
  }

  for (const provider of available) {
    for (const model of provider.models) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;

        const attempts = input.json ? [true, false] : [false];
        for (const useJson of attempts) {
          const body: Record<string, unknown> = {
            model,
            temperature: input.temperature ?? 0.6,
            messages: input.messages,
          };
          if (useJson) body.response_format = { type: "json_object" };

          const response = await fetch(provider.url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          });
          const text = await response.text();
          if (!response.ok) {
            input.logger?.warn(`${provider.name}/${model} ${response.status}: ${text.slice(0, 220)}`);
            continue;
          }
          const parsed = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
          const content = parsed.choices?.[0]?.message?.content?.trim();
          if (content) return content;
        }
      } catch (error) {
        input.logger?.warn(`${provider.name}/${model} error: ${String(error)}`);
      }
    }
  }
  return null;
}
