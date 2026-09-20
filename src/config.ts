/**
 * Leitura de ambiente que falha cedo e diz o que falta.
 *
 * Credencial lida só no momento do uso é a receita de um cron "verde" que
 * nunca publicou nada: ele roda, não encontra post vencido, e sai com sucesso
 * por meses. Quando enfim houver um post, a falta do segredo aparece no pior
 * momento — e pode marcar o post como falho por erro de configuração.
 */

export function env(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Falta a variável de ambiente ${nome}`);
  return valor;
}

export function envOpcional(nome: string): string | null {
  return process.env[nome] || null;
}

/** Confere um conjunto de uma vez e lista TUDO que falta, não só o primeiro. */
export function exigir(nomes: string[]): void {
  const faltando = nomes.filter((n) => !process.env[n]);
  if (faltando.length > 0) {
    throw new Error(
      `Faltam variáveis de ambiente: ${faltando.join(", ")}. ` +
        "Nada foi tocado na fila — corrija e rode de novo."
    );
  }
}
