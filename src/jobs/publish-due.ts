/**
 * Publica o que já foi aprovado e cujo horário chegou.
 *
 * O arranjo aqui não é estético: PUBLICAR E REGISTRAR SÃO SEPARADOS DE
 * PROPÓSITO. Quando os dois ficavam no mesmo try, uma publicação bem-sucedida
 * com gravação falha caía no catch e virava `failed` — com a mídia JÁ no ar. O
 * `media_publish` é o ponto sem volta, então ele fica sozinho.
 *
 *   npm run publish-due -- --dry-run   # valida tudo sem publicar nada
 */
import { requireEnv } from "../config";
import { connect, markFailed, markPublished, due } from "../queue";
import { publishPhoto, publishReel, publishStory } from "../publish/instagram";
import { notify } from "../approval/telegram";

const SECO = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  // Antes de tocar na fila. Um cron que nunca achou post vencido passa meses
  // "verde" sem nunca ter publicado; sem esta checagem, a primeira publicação
  // real descobriria a falta do segredo e ainda marcaria o post como falho.
  requireEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "META_LONG_LIVED_TOKEN", "IG_USER_ID"]);

  const sb = connect();
  const fila = await due(sb);
  if (fila.length === 0) {
    console.log("nenhum post vencido.");
    return;
  }

  if (SECO) {
    console.log(`[dry-run] ${fila.length} post(s) seriam publicados:`);
    for (const p of fila) {
      const midia = p.kind === "reel" ? p.videoUrl : p.imageUrl;
      const r = midia ? await fetch(midia, { method: "HEAD" }).catch(() => null) : null;
      console.log(`  ${p.id.slice(0, 8)} (${p.kind}) mídia acessível pela Meta: ${r?.ok ? "sim" : "NÃO"}`);
      if (p.kind !== "story") {
        console.log(`    legenda: ${p.caption.length} caracteres${p.caption.length > 2200 ? " (ACIMA do limit)" : ""}`);
      }
    }
    console.log("nada publicado, nada alterado.");
    return;
  }

  for (const p of fila) {
    let mediaId: string;
    try {
      mediaId =
        p.kind === "story"
          ? await publishStory(p.imageUrl!)
          : p.kind === "reel"
            ? await publishReel(p.videoUrl!, p.caption)
            : await publishPhoto(p.imageUrl!, p.caption);
    } catch (err) {
      // Falha aqui é anterior ao post existir: nada foi ao ar. Seguro marcar
      // falho — o retry pode tentar de novo.
      const msg = err instanceof Error ? err.message : String(err);
      await markFailed(sb, p.id, msg);
      await notify(`⚠️ Falha ao publicar: ${msg}`);
      console.error(`falha ${p.id}: ${msg}`);
      continue;
    }

    // Daqui para baixo o post EXISTE na rede, aconteça o que acontecer.
    const reg = await markPublished(sb, p.id, mediaId);
    if (!reg.ok) {
      // Nunca marcar falho aqui: o post está no ar e retentar duplicaria.
      // Barulhento de propósito.
      const alerta = [
        "🚨 Publicado na rede mas NÃO registrado na fila.",
        `media id: ${mediaId}`,
        `linha: ${p.id}`,
        `erro do banco: ${reg.erro}`,
        "AÇÃO: marque a linha como posted à mão, ou o próximo ciclo republica.",
      ].join("\n");
      console.error(alerta);
      await notify(alerta);
      continue;
    }
    console.log(`publicado ${p.id} → ${mediaId}`);
  }
}

main();
