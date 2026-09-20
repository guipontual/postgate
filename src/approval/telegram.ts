/**
 * O portão humano: manda o rascunho para um grupo e espera alguém decide.
 *
 * Telegram por ser o caminho mais curto entre "um agente propôs" e "uma
 * pessoa aprovou do celular", sem construir painel nenhum.
 */
import { env, optionalEnv } from "../config";
import type { QueueItem } from "../types";

const API = (metodo: string) => `https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}/${metodo}`;

export async function sendForApproval(item: QueueItem, fonte: string): Promise<number | null> {
  const chatId = env("TELEGRAM_CHAT_ID");
  const legenda = [
    `*${fonte}* · ${item.kind}`,
    "",
    item.caption.slice(0, 900),
    "",
    item.linkUrl,
  ].join("\n");

  const res = await fetch(API(item.imageUrl ? "sendPhoto" : "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      ...(item.imageUrl ? { photo: item.imageUrl, caption: legenda } : { text: legenda }),
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Aprovar", callback_data: `ok:${item.id}` },
            { text: "🚫 Recusar", callback_data: `no:${item.id}` },
          ],
        ],
      },
    }),
  });
  const json = (await res.json()) as { ok: boolean; result?: { message_id: number } };
  if (!json.ok) return null;
  return json.result?.message_id ?? null;
}

export async function notify(text: string): Promise<void> {
  const token = optionalEnv("TELEGRAM_BOT_TOKEN");
  const chatId = optionalEnv("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return; // notify é melhor-esforço: nunca derruba o job
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  }).catch(() => {});
}

export async function answerButton(callbackQueryId: string, text: string): Promise<void> {
  await fetch(API("answerCallbackQuery"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text }),
  }).catch(() => {});
}
