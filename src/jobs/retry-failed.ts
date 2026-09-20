/**
 * Devolve posts falhos para a fila de agendados.
 *
 * Separado do publicador de propósito: retentar é decisão, não automatismo.
 * Post que falhou por legenda longa ou imagem inacessível volta a falhar
 * sozinho — e cada tentativa gasta chamada de API.
 */
import { exigir } from "../config";
import { conectar, TABELA } from "../queue";

async function main(): Promise<void> {
  exigir(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const sb = conectar();

  const { data, error } = await sb.from(TABELA).select("id, error").eq("status", "failed");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    console.log("nenhum post falho.");
    return;
  }

  for (const p of data as { id: string; error: string | null }[]) {
    console.log(`${p.id.slice(0, 8)}: ${p.error ?? "sem motivo registrado"}`);
  }
  if (!process.argv.includes("--yes")) {
    console.log(`\n${data.length} post(s). Rode com --yes para devolvê-los à fila.`);
    return;
  }
  const { error: e2 } = await sb
    .from(TABELA)
    .update({ status: "scheduled", error: null, scheduled_at: null })
    .eq("status", "failed");
  if (e2) throw new Error(e2.message);
  console.log(`${data.length} post(s) devolvidos à fila.`);
}

main();
