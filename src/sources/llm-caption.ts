/**
 * Fonte que usa um LLM para escrever a legenda — SEM AMARRAR A FORNECEDOR.
 *
 * Esta é a resposta a "funciona com qualquer LLM?": o PostGate não fala com
 * modelo nenhum. Ele recebe uma função `complete(prompt) => text`. Qualquer
 * coisa que saiba responder a isso serve — Ollama na sua máquina, Claude,
 * GPT, Gemini, Kimi, um endpoint interno da empresa, ou uma função que devolve
 * text fixo num teste.
 *
 * Não há SDK aqui de propósito. Dependência de fornecedor dentro de uma
 * biblioteca de fila é como se herda um provedor que não se escolheu.
 *
 *   const fonte = new LlmCaption({
 *     items: async () => [{ ref: "1", link: "...", image: "...", subject: "..." }],
 *     complete: async (p) => (await ollama(p)),      // ou qualquer outro
 *   });
 */
import type { ContentSource, Draft } from "../types";

export type RawItem = {
  ref?: string;
  link: string;
  image?: string;
  /** O que o modelo precisa saber para escrever. */
  subject: string;
};

export type Complete = (prompt: string) => Promise<string>;

export type LlmOptions = {
  items: (count: number) => Promise<RawItem[]>;
  complete: Complete;
  /** Instrução de voz. Sem isto, todo post sai com a mesma cara de anúncio. */
  instruction?: string;
  /** Limite de caracteres da legenda. O Instagram corta em 2200. */
  limit?: number;
};

const INSTRUCAO_PADRAO = `Escreva a legenda de um post. Regras:
- Português do Brasil, tom direto, sem superlativo publicitário.
- Nada de "imperdível", "não perca", promessa de resultado.
- Uma ideia só. Nenhum número que não esteja no material dado.
- Sem hashtag inventada: no máximo três, específicas.
Responda apenas com a legenda, sem aspas e sem comentário.`;

export class LlmCaption implements ContentSource {
  readonly name = "llm-caption";

  constructor(private readonly op: LlmOptions) {}

  async buildDrafts(count: number): Promise<Draft[]> {
    const items = await this.op.items(count);
    const limit = this.op.limit ?? 2200;
    const drafts: Draft[] = [];

    for (const item of items) {
      const prompt = `${this.op.instruction ?? INSTRUCAO_PADRAO}\n\nMaterial:\n${item.subject}\n\nLink: ${item.link}`;
      const text = (await this.op.complete(prompt)).trim();

      // Modelo que devolve nada, ou devolve um romance, não vira post. Recusar
      // aqui é mais barato que descobrir no card de aprovação — ou pior, no ar.
      if (!text) {
        console.warn(`${this.name}: modelo devolveu vazio para ${item.ref ?? item.link}`);
        continue;
      }
      if (text.length > limit) {
        console.warn(`${this.name}: legenda de ${text.length} caracteres passa de ${limit}; descartada`);
        continue;
      }

      drafts.push({
        sourceRef: item.ref ?? null,
        linkUrl: item.link,
        imageUrl: item.image ?? null,
        caption: text,
        kind: "feed",
      });
    }
    return drafts;
  }
}
