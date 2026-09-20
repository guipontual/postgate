/**
 * Saúde da fila. Não é painel: é a pergunta "isto ainda funciona?" respondida
 * sem alguém precisar lembrar de perguntar.
 *
 * O caso que motivou: silêncio parece calmaria. Fila vazia porque tudo foi
 * publicado e fila vazia porque o gerador morreu têm a mesma aparência.
 */
import { requireEnv } from "../config";
import { connect, TABLE } from "../queue";
import { notify } from "../approval/telegram";

async function main(): Promise<void> {
  requireEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const sb = connect();

  const contar = async (status: string): Promise<number> => {
    const { count } = await sb.from(TABLE).select("id", { count: "exact", head: true }).eq("status", status);
    return count ?? 0;
  };

  const [pendentes, agendados, falhos] = await Promise.all([
    contar("pending"),
    contar("scheduled"),
    contar("failed"),
  ]);

  // Pendente demais = ninguém está aprovando. Zero agendado = nada vai ao ar.
  const problemas: string[] = [];
  if (pendentes > 10) problemas.push(`${pendentes} posts esperando aprovação`);
  if (falhos > 0) problemas.push(`${falhos} posts falharam e ninguém tentou de novo`);
  if (agendados === 0 && pendentes === 0) problemas.push("fila vazia: o gerador pode ter parado");

  console.log(`pendentes ${pendentes} · agendados ${agendados} · falhos ${falhos}`);
  if (problemas.length > 0) await notify(`Fila de posts:\n- ${problemas.join("\n- ")}`);
}

main();
