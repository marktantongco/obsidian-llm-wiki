import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { config } from "./config.js";
import { parseMarkdown, chunkUUID } from "./chunker.js";
import { embed } from "./embed.js";
import { ensureCollection, upsert } from "./qdrant.js";

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

async function main() {
  const vault = config.vaultPath;
  try { await stat(vault); } catch { console.error(`Vault not found: ${vault}. Create ./vault or set VAULT_PATH`); process.exit(1); }
  console.log(`Ingesting vault: ${vault}`);
  const files = await walk(vault);
  console.log(`Found ${files.length} markdown files`);
  let allChunks: { id:string, content:string, payload: Record<string,unknown> }[] = [];
  for (const f of files) {
    const raw = await readFile(f, "utf8");
    const rel = relative(vault, f);
    const chunks = parseMarkdown(rel, raw);
    for (const c of chunks) {
      const id = chunkUUID(`${rel}::${c.content.slice(0,120)}`);
      allChunks.push({ id, content: c.content, payload: { path: c.path, title: c.title, content: c.content, headings: c.headings, links: c.links, tags: c.tags } });
    }
  }
  console.log(`Chunks: ${allChunks.length}`);
  if (allChunks.length === 0) { console.log("No chunks — add .md files to vault/"); return; }

  // Embed in batches of 4
  const vectors: number[][] = [];
  for (let i=0;i<allChunks.length;i+=4) {
    const batch = allChunks.slice(i,i+4).map(c=>c.content);
    const vs = await embed(batch);
    vectors.push(...vs);
    console.log(`Embedded ${Math.min(i+4, allChunks.length)}/${allChunks.length}`);
  }
  await ensureCollection(vectors[0].length);
  const points = allChunks.map((c, i) => ({ id: c.id, vector: vectors[i], payload: c.payload }));
  await upsert(points as never);
  console.log(`Upserted ${points.length} points to ${config.collection} @ ${config.qdrantUrl}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
