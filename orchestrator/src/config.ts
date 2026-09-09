export const config = {
  vaultPath: process.env.VAULT_PATH || "/app/vault",
  qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  obsidianUrl: process.env.OBSIDIAN_REST_API_URL || "http://127.0.0.1:27123",
  obsidianKey: process.env.OBSIDIAN_REST_API_KEY || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  openaiKey: process.env.OPENAI_API_KEY || "",
  port: Number(process.env.PORT || 8790),
  collection: "obsidian_vault",
  embedModel: process.env.EMBED_MODEL || "nomic-embed-text",
  chunkSize: 800,
  chunkOverlap: 120,
};
