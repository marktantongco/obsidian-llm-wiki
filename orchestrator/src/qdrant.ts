import { config } from "./config.js";

export async function ensureCollection(dim = 768) {
  const r = await fetch(`${config.qdrantUrl}/collections/${config.collection}`);
  if (r.ok) return;
  const create = await fetch(`${config.qdrantUrl}/collections/${config.collection}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vectors: { size: dim, distance: "Cosine" } })
  });
  if (!create.ok) throw new Error(`qdrant create: ${await create.text()}`);
}

export async function upsert(points: { id: string|number, vector: number[], payload: Record<string, unknown> }[]) {
  const res = await fetch(`${config.qdrantUrl}/collections/${config.collection}/points?wait=true`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points })
  });
  if (!res.ok) throw new Error(`qdrant upsert: ${await res.text()}`);
}

export async function search(vector: number[], limit = 6, filter?: unknown) {
  const res = await fetch(`${config.qdrantUrl}/collections/${config.collection}/points/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vector, limit, with_payload: true, filter })
  });
  if (!res.ok) throw new Error(`qdrant search: ${await res.text()}`);
  const j = await res.json() as { result: { payload: Record<string,unknown>, score: number }[] };
  return j.result;
}
