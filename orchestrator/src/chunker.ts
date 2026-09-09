import matter from "gray-matter";

// Obsidian-aware chunking: respects frontmatter, headings, wikilinks
export interface Chunk {
  id: string;
  path: string;
  title: string;
  content: string;
  headings: string[];
  links: string[]; // [[wikilinks]]
  tags: string[];
}

export function parseMarkdown(relPath: string, raw: string): Omit<Chunk, "id">[] {
  const { data, content } = matter(raw);
  const tags: string[] = Array.isArray(data.tags) ? data.tags : data.tags ? [String(data.tags)] : [];
  const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m => m[1].trim());
  const links = [...content.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)].map(m => m[1].trim());
  const title = (data.title as string) || headings[0] || relPath.split("/").pop()!.replace(/\.md$/, "");

  // Split by headings + size window
  const sections = content.split(/(?=^#{1,6}\s+)/m).filter(s => s.trim().length > 30);
  if (sections.length === 0) return [];
  const chunks: Omit<Chunk, "id">[] = [];
  for (const sec of sections) {
    // further window if too long
    for (let i = 0; i < sec.length; i += 700) {
      const slice = sec.slice(i, i + 800).trim();
      if (slice.length < 30) continue;
      chunks.push({ path: relPath, title, content: slice, headings, links, tags });
    }
  }
  return chunks.length ? chunks : [{ path: relPath, title, content: content.slice(0, 800), headings, links, tags }];
}

export function chunkHash(s: string): number {
  let h = 0; for (let i=0;i<s.length;i++) h = (Math.imul(31,h)+s.charCodeAt(i))|0; return Math.abs(h) + Math.floor(Math.random()*1000);
}
export function chunkUUID(s: string): string {
  // deterministic UUID v4-like from hash
  let h1 = 0, h2 = 0; for (let i=0;i<s.length;i++){ h1=(Math.imul(31,h1)+s.charCodeAt(i))|0; h2=(Math.imul(17,h2)+s.charCodeAt(i))|0; }
  const hex = (n:number)=> (n>>>0).toString(16).padStart(8,'0');
  return `${hex(h1)}-${hex(h2).slice(0,4)}-4${hex(h2).slice(1,4)}-8${hex(h1).slice(1,4)}-${hex(h1)}${hex(h2)}`.slice(0,36);
}
