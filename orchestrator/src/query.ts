import { config } from "./config.js";
import { embed } from "./embed.js";
import { search } from "./qdrant.js";
import { routeLLM, autoRoute } from "./llm.js";

export async function queryVault(question: string, providerOverride?: string) {
  const [qvec] = await embed([question]);
  const hits = await search(qvec, 6);
  const ctx = hits.map((h,i)=>`[${i+1}] ${h.payload["path"]} — ${String(h.payload["content"]).slice(0,700)}`).join("\n\n");
  const system = "You are an Obsidian wiki assistant. Answer strictly from vault context. Cite sources as [1], [2]. If context insufficient, say so.";
  const prompt = `Context:\n${ctx}\n\nQuestion: ${question}\n\nAnswer concisely with citations.`;
  const provider = (providerOverride as never) || autoRoute(question, hits.map(h=>String(h.payload["path"])));
  console.log(`Routing to ${provider} (${hits.length} hits)`);
  const answer = await routeLLM(provider as never, prompt, system);
  return { provider, hits, answer };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const q = process.argv.slice(2).join(" ") || "What is DepthWiki?";
  queryVault(q).then(r=>{
    console.log(`\n=== Answer (${r.provider}) ===\n${r.answer}\n\n=== Sources ===`);
    r.hits.forEach((h,i)=>console.log(`[${i+1}] ${h.payload["path"]} score=${h.score.toFixed(3)}`));
  }).catch(e=>{ console.error(e); process.exit(1); });
}
