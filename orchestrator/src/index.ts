import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { embed } from "./embed.js";
import { search } from "./qdrant.js";
import { routeLLM, autoRoute } from "./llm.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

// Health
app.get("/health", async()=>({ ok:true, vault: config.vaultPath, qdrant: config.qdrantUrl, ollama: config.ollamaUrl }));

// Obsidian Local REST API proxy (contrarian lane)
app.get("/vault/files", async(req, reply)=>{
  if (!config.obsidianKey) return reply.code(501).send({ error: "OBSIDIAN_REST_API_KEY not set. Install obsidian-local-rest-api plugin." });
  const r = await fetch(`${config.obsidianUrl}/vault/`, { headers: { Authorization: `Bearer ${config.obsidianKey}` }});
  const j = await r.json(); return j;
});

// RAG query: POST /query { question, provider? } -> provider routed answer
app.post("/query", async (req)=> {
  const { question, provider } = req.body as { question: string; provider?: string };
  if (!question) throw new Error("question required");
  const [qvec] = await embed([question]);
  const hits = await search(qvec, 6);
  const ctx = hits.map((h,i)=>`[${i+1}] ${h.payload["path"]}: ${String(h.payload["content"]).slice(0,700)}`).join("\n\n");
  const sys = "You are an Obsidian vault wiki assistant. Answer from context only; cite [n].";
  const prompt = `Context:\n${ctx}\n\nQuestion: ${question}`;
  const routed = (provider as never) || autoRoute(question, hits.map(h=>String(h.payload["path"])));
  const answer = await routeLLM(routed as never, prompt, sys);
  return { provider: routed, answer, sources: hits.map((h,i)=>({ n:i+1, path: h.payload["path"], title: h.payload["title"], score: h.score })) };
});

// Semantic search only (no LLM)
app.post("/search", async (req)=>{
  const { query, limit } = req.body as { query: string; limit?: number };
  const [v] = await embed([query]);
  const hits = await search(v, limit||6);
  return { hits: hits.map(h=>({ score:h.score, ...h.payload })) };
});

app.listen({ port: config.port, host: "0.0.0.0" }).then(()=>console.log(`Orchestrator listening on :${config.port}`));
