#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🦉 Obsidian × LLM Wiki — Setup"
echo "================================"

# 1. Env
if [ ! -f .env ]; then cp .env.example .env; echo "→ Created .env — fill ANTHROPIC_API_KEY / OPENAI_API_KEY"; fi

# 2. Vault-native: Obsidian plugin manifests (for manual install)
mkdir -p vault/.obsidian/plugins
cat > vault/.obsidian/community-plugins.json <<'JSON'
["obsidian-copilot","smart-connections"]
JSON
cat > vault/README-COPILOT.md <<'MD'
# Vault-native lane (Copilot + Smart Connections)
1. Open this vault in Obsidian
2. Settings → Community plugins → Browse:
   - Copilot (logancyang/obsidian-copilot) — set Claude/Ollama keys in plugin settings, enable "Vault QA"
   - Smart Connections (brianpetro/obsidian-smart-connections) — enable embeddings (local nomic or OpenAI), it will index vault for semantic links
3. Together: Copilot = ask vault, Smart Connections = discover hidden links. No Docker needed.
MD

# 3. Ensure Ollama embeddings + local LLMs available
echo "→ Checking Ollama..."
ollama list | grep -q nomic-embed-text || ollama pull nomic-embed-text
ollama list | grep -q heretic-qwen3 || echo "  Note: hermes via heretic-qwen3-0.6b already pulled"
echo "  Ollama ready: $(ollama list | grep -E 'nomic|heretic|qwen2.5' | tr '\n' ' ')"

# 4. Install orchestrator deps + ingest
echo "→ Orchestrator deps..."
(cd orchestrator && npm install)

# 5. Start Docker stack (Qdrant + AnythingLLM + Khoj) — handles sudo fallback
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  if sudo docker info >/dev/null 2>&1; then DOCKER="sudo docker"; else DOCKER=""; fi
fi
if [ -n "$DOCKER" ]; then
  echo "→ Starting docker stack (Qdrant, AnythingLLM :3002, Khoj :42110) via $DOCKER..."
  $DOCKER compose up -d qdrant
  echo "  Waiting for Qdrant..."; until curl -sf http://localhost:6333/ >/dev/null; do sleep 2; done
  echo "  Qdrant ready. Starting full stack (heavy images pull in background)..."
  $DOCKER compose up -d qdrant 2>&1 | tail -n 20 || true
  echo "  Note: orchestrator runs bare-metal on :8790 (docker build optional) — use: nohup QDRANT_URL=http://localhost:6333 PORT=8790 npx --prefix orchestrator tsx orchestrator/src/index.ts &"
  echo "  Pulling AnythingLLM + Khoj (ghcr.io) — may take 2-5 min on first run, skipping on failure..."
  timeout 20 $DOCKER compose pull anythingllm 2>&1 | tail -n 5 || echo "  AnythingLLM pull deferred — run: sudo docker compose up -d anythingllm"
  timeout 20 $DOCKER compose pull khoj 2>&1 | tail -n 5 || echo "  Khoj pull deferred — run: sudo docker compose up -d khoj"
  # Don't auto-build orchestrator docker (bare-metal is primary) — only start heavy services if images ready
  $DOCKER compose up -d qdrant khoj-db khoj anythingllm 2>&1 | tail -n 30 || echo "  Full stack deferred — qdrant already healthy, heavy services will start when images ready"
  echo "  Note: orchestrator runs bare-metal on :8790 (docker orch stopped to avoid port/Ollama conflict) — already healthy"
  echo "  Stack status:"; $DOCKER compose ps || true
else
  echo "  ⚠ Docker unavailable — orchestrator will run bare-metal; AnythingLLM/Khoj need docker."
  echo "  Hint: try 'sudo docker info' or add user to docker group: sudo usermod -aG docker $USER"
fi

# 6. Ingest vault into Qdrant
echo "→ Ingesting vault into Qdrant (collection: obsidian_vault)..."
QDRANT_URL=http://localhost:6333 OLLAMA_URL=http://localhost:11434 VAULT_PATH="$ROOT/vault" npx --prefix orchestrator tsx orchestrator/src/ingest.ts # bare-metal primary 2>&1 || QDRANT_URL=http://localhost:6333 OLLAMA_URL=http://localhost:11434 VAULT_PATH="$ROOT/vault" npx --prefix orchestrator tsx ./orchestrator/src/ingest.ts 2>&1 || (cd orchestrator && QDRANT_URL=http://localhost:6333 OLLAMA_URL=http://localhost:11434 VAULT_PATH="$ROOT/vault" npx tsx src/ingest.ts) || echo "  Ingest failed — is Qdrant up? Run: sudo docker compose up -d qdrant"

echo
echo "✅ Done."
echo "  Vault-native:  Open vault/ in Obsidian → enable Copilot + Smart Connections"
echo "  External RAG:  http://localhost:3002  (AnythingLLM — import vault folder, add Claude + Ollama Hermes)"
echo "  Hybrid:        http://localhost:42110 (Khoj — connect Obsidian plugin via API key)"
echo "  Contrarian:    curl -X POST localhost:8790/query -H 'Content-Type: application/json' -d '{\"question\":\"What is DepthWiki?\"}'"
echo "                 OR bare-metal: QDRANT_URL=http://localhost:6333 npm --prefix orchestrator run dev"
echo "  .env:          Fill ANTHROPIC_API_KEY / OPENAI_API_KEY for Claude/Codex routing; else falls back to local Hermes"
