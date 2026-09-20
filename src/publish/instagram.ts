/**
 * Publicação no Instagram pela Graph API.
 *
 * Exige conta Business/Creator e um app seu na Meta — veja docs/meta-setup.md.
 * Não há como empacotar isso: o token é da sua conta.
 *
 * Detalhe que custa caro descobrir sozinho: a MÍDIA É BAIXADA PELOS SERVIDORES
 * DA META, não pelo seu. URL que abre no seu navegador mas exige sessão, ou
 * que responde só na sua rede, falha aqui com erro genérico.
 */
import { env } from "../config";

/**
 * A Meta tem DOIS caminhos para publicar no Instagram, com hosts diferentes, e
 * o token de um não é aceito pelo outro:
 *
 *   graph.instagram.com  — "Instagram API com Instagram Login". Você loga com
 *                          a própria conta do Instagram. É o caminho mais
 *                          curto e o padrão aqui.
 *   graph.facebook.com   — "Instagram Graph API" via Login do Facebook, com
 *                          Página vinculada. Use se o seu app foi montado assim.
 *
 * Errar o host devolve "Cannot parse access token", que parece token expirado
 * e não é — custou uma renovação de token quase feita à toa. Se você vir essa
 * mensagem com um token recém-gerado, é o host.
 */
const GRAPH = (process.env.META_GRAPH_HOST ?? "https://graph.instagram.com") + "/v21.0";

async function post(caminho: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams({ ...params, access_token: env("META_LONG_LIVED_TOKEN") });
  const res = await fetch(`${GRAPH}/${caminho}`, { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(`Meta ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

/**
 * Vídeo não fica pronto na hora: o container passa por IN_PROGRESS antes de
 * FINISHED. Publicar sem esperar devolve erro que parece de permissão.
 */
async function waitForContainer(containerId: string, tentativas = 30): Promise<void> {
  for (let i = 0; i < tentativas; i++) {
    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${env("META_LONG_LIVED_TOKEN")}`
    );
    const json = (await res.json()) as { status_code?: string };
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR") throw new Error(`container ${containerId} falhou no processamento`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`container ${containerId} não ficou pronto a tempo`);
}

export async function publishPhoto(imageUrl: string, caption: string): Promise<string> {
  const igUserId = env("IG_USER_ID");
  const container = await post(`${igUserId}/media`, { image_url: imageUrl, caption });
  const publicado = await post(`${igUserId}/media_publish`, { creation_id: container.id });
  return publicado.id as string;
}

/** Stories NÃO aceita legenda: o text precisa estar na própria arte 1080x1920. */
export async function publishStory(imageUrl: string): Promise<string> {
  const igUserId = env("IG_USER_ID");
  const container = await post(`${igUserId}/media`, { image_url: imageUrl, media_type: "STORIES" });
  const publicado = await post(`${igUserId}/media_publish`, { creation_id: container.id });
  return publicado.id as string;
}

export async function publishReel(videoUrl: string, caption: string): Promise<string> {
  const igUserId = env("IG_USER_ID");
  const container = await post(`${igUserId}/media`, {
    video_url: videoUrl,
    caption,
    media_type: "REELS",
  });
  await waitForContainer(container.id);
  const publicado = await post(`${igUserId}/media_publish`, { creation_id: container.id });
  return publicado.id as string;
}

/**
 * O token de 60 dias expira. Renovar é uma chamada; esquecer é descobrir num
 * domingo que nada é publicado há semanas. Rode isso num cron mensal.
 */
export async function refreshToken(): Promise<string> {
  const res = await fetch(
    `${process.env.META_GRAPH_HOST ?? "https://graph.instagram.com"}/refresh_access_token` +
      `?grant_type=ig_refresh_token&access_token=${env("META_LONG_LIVED_TOKEN")}`
  );
  const json = (await res.json()) as { access_token?: string };
  if (!res.ok || !json.access_token) throw new Error(`renovação falhou: ${JSON.stringify(json)}`);
  return json.access_token;
}
