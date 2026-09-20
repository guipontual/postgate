/**
 * Fonte de exemplo: lê um file JSON. Sem banco, sem LLM, sem serviço.
 *
 * Serve para ver o sistema inteiro funcionando antes de escrever a sua.
 * Formato esperado (content.json na raiz):
 *
 *   [{ "ref": "1", "link": "https://...", "image": "https://...", "text": "..." }]
 */
import { readFileSync } from "node:fs";
import type { ContentSource, Draft } from "../types";

type Item = { ref?: string; link: string; image?: string; text: string };

export class JsonExample implements ContentSource {
  readonly name = "json-example";

  constructor(private readonly file = "content.json") {}

  async buildDrafts(count: number): Promise<Draft[]> {
    let items: Item[];
    try {
      items = JSON.parse(readFileSync(this.file, "utf8")) as Item[];
    } catch {
      console.warn(`${this.name}: não consegui ler ${this.file}`);
      return [];
    }
    return items.slice(0, count).map((i) => ({
      sourceRef: i.ref ?? null,
      linkUrl: i.link,
      imageUrl: i.image ?? null,
      caption: i.text,
      kind: "feed" as const,
    }));
  }
}
