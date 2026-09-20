/**
 * O que fazer quando alguém aperta um botão. Sem framework: recebe o update
 * do Telegram e devolve texto. Serve igual para webhook e para polling — a
 * diferença entre os dois é só COMO o update chega.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { decidir } from "../queue";
import { responderBotao } from "./telegram";

export type TelegramUpdate = {
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number };
  };
};

/**
 * Aprovar AGENDA, não publica.
 *
 * Parece detalhe e não é: publicar no instante da aprovação amarra o horário
 * do post ao momento em que alguém olhou o celular. Separar deixa aprovar às
 * 23h um post que vai ao ar às 9h — e deixa o servidor estar desligado no meio.
 */
export async function tratarUpdate(
  sb: SupabaseClient,
  update: TelegramUpdate,
  agendarPara: (agora: Date) => string | null = proximoHorarioPadrao
): Promise<string | null> {
  const cq = update.callback_query;
  if (!cq?.data) return null;

  const [acao, id] = cq.data.split(":");
  if (!id || (acao !== "ok" && acao !== "no")) return null;

  if (acao === "no") {
    await decidir(sb, id, "rejected");
    await responderBotao(cq.id, "Recusado.");
    return `recusado ${id}`;
  }

  const quando = agendarPara(new Date());
  await decidir(sb, id, "scheduled", quando);
  await responderBotao(cq.id, quando ? `Agendado para ${quando.slice(0, 16)}` : "Agendado para já");
  return `agendado ${id}`;
}

/** Próximo dia às 9h, hora local do servidor. Troque à vontade. */
export function proximoHorarioPadrao(agora: Date): string {
  const d = new Date(agora);
  d.setHours(d.getHours() < 9 ? 9 : 33, 0, 0, 0); // 33h = 9h do dia seguinte
  return d.toISOString();
}
