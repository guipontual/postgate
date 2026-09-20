/**
 * Os tipos que separam o genérico do seu assunto.
 *
 * Isto nasceu de um sistema que publicava imóveis. O que era específico —
 * "imóvel", "desconto", "financiamento" — virou uma interface: a fila, a
 * aprovação e a publicação não sabem sobre o que você posta, e não precisam.
 */

/** Um post pronto para entrar na fila. */
export type Draft = {
  /**
   * Referência opaca ao item de origem, no formato que a SUA fonte entende.
   * A fila só guarda e devolve — nunca interpreta. É por aqui que se evita
   * chave estrangeira para a tabela de outra pessoa.
   */
  sourceRef: string | null;
  /** Para onde o post aponta. Precisa ser público: a Meta e o Telegram acessam. */
  linkUrl: string;
  /** Imagem do feed/story. URL pública e baixável PELA META, não pelo seu servidor. */
  imageUrl: string | null;
  /** Vídeo do reel. Mesma exigência. */
  videoUrl?: string | null;
  /** Legenda. Stories ignora — lá o texto vive na própria arte. */
  caption: string;
  kind?: PostKind;
};

export type PostKind = "feed" | "story" | "reel";

/**
 * Estados da fila, e o que cada um significa na prática:
 *
 *  pending   — esperando um humano decidir
 *  scheduled — aprovado; publica quando `scheduled_at` chegar
 *  posted    — está no ar (ponto sem volta)
 *  rejected  — humano recusou
 *  failed    — tentou publicar e não foi ao ar
 */
export type PostStatus = "pending" | "scheduled" | "posted" | "rejected" | "failed";

export type QueueItem = {
  id: string;
  sourceRef: string | null;
  linkUrl: string;
  imageUrl: string | null;
  videoUrl: string | null;
  caption: string;
  kind: PostKind;
  status: PostStatus;
  scheduledAt: string | null;
  telegramMessageId: number | null;
  mediaId: string | null;
  error: string | null;
};

/**
 * De onde vêm os posts. Implemente uma destas e o resto do sistema funciona.
 *
 * A única regra: devolva itens já prontos para um humano aprovar. Filtrar o
 * que não presta é trabalho da fonte, não da fila — quem aprova não deve ser
 * usado como filtro de qualidade, ou ele aprende a apertar "recusar" no
 * automático e para de ler.
 */
export interface ContentSource {
  /** Nome curto, aparece em log e no card de aprovação. */
  readonly name: string;
  buildDrafts(count: number): Promise<Draft[]>;
}
