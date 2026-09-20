/**
 * Pede drafts à sua fonte, põe na fila e manda para aprovação.
 *
 * Trocar a fonte é trocar UMA linha aqui.
 */
import { requireEnv } from "../config";
import { connect, enqueue, alreadyQueued } from "../queue";
import { sendForApproval } from "../approval/telegram";
import { JsonExample } from "../sources/json-example";

const fonte = new JsonExample(); // ← sua fonte aqui

async function main(): Promise<void> {
  requireEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"]);
  const quantos = Number(process.argv.find((a) => a.startsWith("--count="))?.split("=")[1] ?? 2);

  const sb = connect();
  const drafts = await fonte.buildDrafts(quantos);
  if (drafts.length === 0) {
    console.log(`${fonte.name}: nada a propor hoje.`);
    return;
  }

  for (const d of drafts) {
    if (d.sourceRef && (await alreadyQueued(sb, d.sourceRef))) {
      console.log(`pulando ${d.sourceRef}: já esteve na fila`);
      continue;
    }
    const item = await enqueue(sb, d);
    const msgId = await sendForApproval(item, fonte.name);
    if (msgId) await sb.from("postgate_queue").update({ telegram_message_id: msgId }).eq("id", item.id);
    console.log(`enfileirado ${item.id}`);
  }
}

main();
