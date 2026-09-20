/**
 * Fonte que usa um LLM para escrever a legenda — SEM AMARRAR A FORNECEDOR.
 *
 * Esta é a resposta a "funciona com qualquer LLM?": o PostGate não fala com
 * modelo nenhum. Ele recebe uma função `completar(prompt) => texto`. Qualquer
 * coisa que saiba responder a isso serve — Ollama na sua máquina, Claude,
 * GPT, Gemini, Kimi, um endpoint interno da empresa, ou uma função que devolve
 * texto fixo num teste.
 *
 * Não há SDK aqui de propósito. Dependência de fornecedor dentro de uma
 * biblioteca de fila é como se herda um provedor que não se escolheu.
 *
 *   const fonte = new LlmLegenda({
 *     itens: async () => [{ ref: "1", link: "...", imagem: "...", assunto: "..." }],
 *     completar: async (p) => (await ollama(p)),      // ou qualquer outro
 *   });
 */
import type { ContentSource, Draft } from "../types";

export type ItemBruto = {
  ref?: string;
  link: string;
  imagem?: string;
  /** O que o modelo precisa saber para escrever. */
  assunto: string;
};

export type Completar = (prompt: string) => Promise<string>;

export type OpcoesLlm = {
  itens: (count: number) => Promise<ItemBruto[]>;
  completar: Completar;
  /** Instrução de voz. Sem isto, todo post sai com a mesma cara de anúncio. */
  instrucao?: string;
  /** Limite de caracteres da legenda. O Instagram corta em 2200. */
  limite?: number;
};

const INSTRUCAO_PADRAO = `Escreva a legenda de um post. Regras:
- Português do Brasil, tom direto, sem superlativo publicitário.
- Nada de "imperdível", "não perca", promessa de resultado.
- Uma ideia só. Nenhum número que não esteja no material dado.
- Sem hashtag inventada: no máximo três, específicas.
Responda apenas com a legenda, sem aspas e sem comentário.`;

export class LlmLegenda implements ContentSource {
  readonly name = "llm-legenda";

  constructor(private readonly op: OpcoesLlm) {}

  async buildDrafts(count: number): Promise<Draft[]> {
    const itens = await this.op.itens(count);
    const limite = this.op.limite ?? 2200;
    const rascunhos: Draft[] = [];

    for (const item of itens) {
      const prompt = `${this.op.instrucao ?? INSTRUCAO_PADRAO}\n\nMaterial:\n${item.assunto}\n\nLink: ${item.link}`;
      const texto = (await this.op.completar(prompt)).trim();

      // Modelo que devolve nada, ou devolve um romance, não vira post. Recusar
      // aqui é mais barato que descobrir no card de aprovação — ou pior, no ar.
      if (!texto) {
        console.warn(`${this.name}: modelo devolveu vazio para ${item.ref ?? item.link}`);
        continue;
      }
      if (texto.length > limite) {
        console.warn(`${this.name}: legenda de ${texto.length} caracteres passa de ${limite}; descartada`);
        continue;
      }

      rascunhos.push({
        sourceRef: item.ref ?? null,
        linkUrl: item.link,
        imageUrl: item.imagem ?? null,
        caption: texto,
        kind: "feed",
      });
    }
    return rascunhos;
  }
}
