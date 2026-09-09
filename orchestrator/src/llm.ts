import { config } from "./config.js";

export type Provider = "claude" | "hermes" | "codex" | "ollama";

export async function routeLLM(provider: Provider, prompt: string, system?: string): Promise<string> {
  if (provider === "hermes" || provider === "ollama") {
    // Local via Ollama — use heretic-qwen3 or qwen2.5:3b
    const model = provider === "hermes" ? "heretic-qwen3-0.6b" : "qwen2.5:3b";
    const r = await fetch(`${config.ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: system ? `${system}\n\n${prompt}` : prompt, stream: false })
    });
    if (!r.ok) throw new Error(`ollama ${model}: ${await r.text()}`);
    const j = await r.json() as { response: string };
    return j.response;
  }
  if (provider === "claude") {
    if (!config.anthropicKey) throw new Error("ANTHROPIC_API_KEY missing — fallback to hermes");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": config.anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1200, system: system || "You are an Obsidian vault assistant. Answer from context only.", messages: [{ role: "user", content: prompt }] })
    });
    if (!r.ok) throw new Error(`claude: ${await r.text()}`);
    const j = await r.json() as { content: { text:string }[] };
    return j.content.map(c=>c.text).join("\n");
  }
  if (provider === "codex") {
    if (!config.openaiKey) throw new Error("OPENAI_API_KEY missing — fallback to hermes");
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.openaiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: system||"" }, { role:"user", content: prompt }] })
    });
    if (!r.ok) throw new Error(`codex: ${await r.text()}`);
    const j = await r.json() as { choices: { message:{ content:string } }[] };
    return j.choices[0].message.content;
  }
  return "unknown provider";
}

// Auto-router: code notes -> codex, private -> hermes (local), reasoning -> claude
export function autoRoute(query: string, topPaths: string[]): Provider {
  const q = query.toLowerCase();
  if (q.includes("code") || topPaths.some(p=>p.includes("/Code/") || p.includes(".code"))) return config.openaiKey ? "codex" : "hermes";
  if (q.includes("private") || q.includes("local")) return "hermes";
  return config.anthropicKey ? "claude" : "hermes";
}
