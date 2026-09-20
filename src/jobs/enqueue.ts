/**
 * Pede rascunhos à sua fonte, põe na fila e manda para aprovação.
 *
 * Trocar a fonte é trocar UMA linha aqui.
 */
import { exigir } from "../config";
import { conectar, enfileirar, jaEnfileirado } from "../queue";
import { enviarParaAprovacao } from "../approval/telegram";
import { ExemploJson } from "../sources/exemplo-json";

const fonte = new ExemploJson(); // ← sua fonte aqui

async function main(): Promise<void> {
  exigir(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"]);
  const quantos = Number(process.argv.find((a) => a.startsWith("--count="))?.split("=")[1] ?? 2);

  const sb = conectar();
  const rascunhos = await fonte.buildDrafts(quantos);
  if (rascunhos.length === 0) {
    console.log(`${fonte.name}: nada a propor hoje.`);
    return;
  }

  for (const d of rascunhos) {
    if (d.sourceRef && (await jaEnfileirado(sb, d.sourceRef))) {
      console.log(`pulando ${d.sourceRef}: já esteve na fila`);
      continue;
    }
    const item = await enfileirar(sb, d);
    const msgId = await enviarParaAprovacao(item, fonte.name);
    if (msgId) await sb.from("postgate_queue").update({ telegram_message_id: msgId }).eq("id", item.id);
    console.log(`enfileirado ${item.id}`);
  }
}

main();
