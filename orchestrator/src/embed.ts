import { config } from "./config.js";

// Ollama embeddings (nomic-embed-text 274MB, already pulled)
export async function embed(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (const text of texts) {
    const res = await fetch(`${config.ollamaUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.embedModel, input: text })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`ollama embed failed ${res.status}: ${t.slice(0,500)}`);
    }
    const j = await res.json() as { embeddings: number[][] };
    vectors.push(j.embeddings[0]);
  }
  return vectors;
}
