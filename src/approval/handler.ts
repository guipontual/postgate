/**
 * O que fazer quando alguém aperta um botão. Sem framework: recebe o update
 * do Telegram e devolve text. Serve igual para webhook e para polling — a
 * diferença entre os dois é só COMO o update chega.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { decide } from "../queue";
import { answerButton } from "./telegram";

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
export async function handleUpdate(
  sb: SupabaseClient,
  update: TelegramUpdate,
  scheduleAt: (agora: Date) => string | null = defaultSchedule
): Promise<string | null> {
  const cq = update.callback_query;
  if (!cq?.data) return null;

  const [acao, id] = cq.data.split(":");
  if (!id || (acao !== "ok" && acao !== "no")) return null;

  if (acao === "no") {
    await decide(sb, id, "rejected");
    await answerButton(cq.id, "Recusado.");
    return `recusado ${id}`;
  }

  const quando = scheduleAt(new Date());
  await decide(sb, id, "scheduled", quando);
  await answerButton(cq.id, quando ? `Agendado para ${quando.slice(0, 16)}` : "Agendado para já");
  return `agendado ${id}`;
}

/** Próximo dia às 9h, hora local do servidor. Troque à vontade. */
export function defaultSchedule(agora: Date): string {
  const d = new Date(agora);
  d.setHours(d.getHours() < 9 ? 9 : 33, 0, 0, 0); // 33h = 9h do dia seguinte
  return d.toISOString();
}
