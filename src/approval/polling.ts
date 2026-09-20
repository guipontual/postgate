/**
 * Aprovação SEM HTTPS público.
 *
 * O webhook do Telegram exige um endereço público com certificado. Quem roda
 * em casa atrás de CGNAT não tem isso, e era o bloqueio que mantinha este
 * fluxo preso a uma hospedagem. `getUpdates` resolve: o processo pergunta ao
 * Telegram se há novidade, em vez de esperar ser chamado.
 *
 * Mais lento e mais simples. Para aprovar post, alguns segundos não importam.
 *
 *   npm run approve-polling
 */
import { env } from "../config";
import { conectar } from "../queue";
import { tratarUpdate, type TelegramUpdate } from "./handler";

const API = (m: string) => `https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}/${m}`;

async function main(): Promise<void> {
  const sb = conectar();
  let offset = 0;
  console.log("aguardando decisões no Telegram (Ctrl+C para sair)");

  for (;;) {
    try {
      // long polling: a chamada fica aberta até 50s se não houver novidade,
      // então isto NÃO é um laço que martela a API.
      const res = await fetch(API(`getUpdates?timeout=50&offset=${offset}`));
      const json = (await res.json()) as { ok: boolean; result?: ({ update_id: number } & TelegramUpdate)[] };
      for (const update of json.result ?? []) {
        offset = update.update_id + 1;
        const feito = await tratarUpdate(sb, update);
        if (feito) console.log(feito);
      }
    } catch (err) {
      console.error("erro no polling:", err instanceof Error ? err.message : String(err));
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main();
