/**
 * Fonte de exemplo: lê um arquivo JSON. Sem banco, sem LLM, sem serviço.
 *
 * Serve para ver o sistema inteiro funcionando antes de escrever a sua.
 * Formato esperado (conteudo.json na raiz):
 *
 *   [{ "ref": "1", "link": "https://...", "imagem": "https://...", "texto": "..." }]
 */
import { readFileSync } from "node:fs";
import type { ContentSource, Draft } from "../types";

type Item = { ref?: string; link: string; imagem?: string; texto: string };

export class ExemploJson implements ContentSource {
  readonly name = "exemplo-json";

  constructor(private readonly arquivo = "conteudo.json") {}

  async buildDrafts(count: number): Promise<Draft[]> {
    let itens: Item[];
    try {
      itens = JSON.parse(readFileSync(this.arquivo, "utf8")) as Item[];
    } catch {
      console.warn(`${this.name}: não consegui ler ${this.arquivo}`);
      return [];
    }
    return itens.slice(0, count).map((i) => ({
      sourceRef: i.ref ?? null,
      linkUrl: i.link,
      imageUrl: i.imagem ?? null,
      caption: i.texto,
      kind: "feed" as const,
    }));
  }
}
