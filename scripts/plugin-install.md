# Vault-native lane — 5-minute install

## Obsidian Copilot (vault QA)
1. Obsidian → Settings → Community plugins → Browse → `Copilot` → Install + Enable
2. Copilot settings → Add provider Claude (Anthropic key) + Ollama (http://localhost:11434) → model qwen2.5:3b or heretic-qwen3-0.6b (Hermes)
3. Enable “Vault QA (RAG-lite)”: `Copilot → Chat → Vault QA → Index vault`
4. Ask: “Summarize all notes linked to [[DepthWiki]]”

## Smart Connections (discovery)
1. Browse → `Smart Connections` → Install + Enable
2. Settings → Embedding model: pick `nomic-embed-text` (local via Ollama) or OpenAI — re-index vault
3. Open any note → Smart Connections pane shows semantically related notes (hidden links)
4. Pair with Copilot: Copilot for Q&A, Smart Connections for exploration

No Docker needed for this lane. For full RAG, run `docker compose up -d` then point AnythingLLM at `vault/`.
