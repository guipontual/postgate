/**
 * A fila. Um Postgres qualquer serve; o cliente aqui é o do Supabase porque
 * ele já traz auth de service role e PostgREST, mas nada no schema é exclusivo.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config";
import type { Draft, PostKind, PostStatus, QueueItem } from "./types";

export const TABELA = "postgate_queue";

export function conectar(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

type Linha = {
  id: string;
  source_ref: string | null;
  link_url: string;
  image_url: string | null;
  video_url: string | null;
  caption: string;
  kind: PostKind;
  status: PostStatus;
  scheduled_at: string | null;
  telegram_message_id: number | null;
  media_id: string | null;
  error: string | null;
};

const daLinha = (l: Linha): QueueItem => ({
  id: l.id,
  sourceRef: l.source_ref,
  linkUrl: l.link_url,
  imageUrl: l.image_url,
  videoUrl: l.video_url,
  caption: l.caption,
  kind: l.kind,
  status: l.status,
  scheduledAt: l.scheduled_at,
  telegramMessageId: l.telegram_message_id,
  mediaId: l.media_id,
  error: l.error,
});

export async function enfileirar(sb: SupabaseClient, draft: Draft): Promise<QueueItem> {
  const { data, error } = await sb
    .from(TABELA)
    .insert({
      source_ref: draft.sourceRef,
      link_url: draft.linkUrl,
      image_url: draft.imageUrl,
      video_url: draft.videoUrl ?? null,
      caption: draft.caption,
      kind: draft.kind ?? "feed",
      status: "pending",
    })
    .select()
    .single();
  if (error) throw new Error(`fila: ${error.message}`);
  return daLinha(data as Linha);
}

/**
 * Já existe post pendente ou publicado para esta origem?
 *
 * Sem isto o mesmo item volta ao grupo de aprovação toda vez que o gerador
 * roda, e quem aprova perde a confiança na fila.
 */
export async function jaEnfileirado(sb: SupabaseClient, sourceRef: string): Promise<boolean> {
  const { count, error } = await sb
    .from(TABELA)
    .select("id", { count: "exact", head: true })
    .eq("source_ref", sourceRef)
    .in("status", ["pending", "scheduled", "posted"]);
  if (error) throw new Error(`fila: ${error.message}`);
  return (count ?? 0) > 0;
}

/** Aprovados cujo horário já chegou (ou sem horário: publica já). */
export async function vencidos(sb: SupabaseClient, limite = 10): Promise<QueueItem[]> {
  const agora = new Date().toISOString();
  const { data, error } = await sb
    .from(TABELA)
    .select("*")
    .eq("status", "scheduled")
    .or(`scheduled_at.lte.${agora},scheduled_at.is.null`)
    .order("scheduled_at", { ascending: true, nullsFirst: true })
    .limit(limite);
  if (error) throw new Error(`fila: ${error.message}`);
  return (data as Linha[]).map(daLinha);
}

export async function marcarPublicado(
  sb: SupabaseClient,
  id: string,
  mediaId: string
): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await sb
    .from(TABELA)
    .update({ status: "posted", media_id: mediaId, decided_at: new Date().toISOString(), error: null })
    .eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function marcarFalha(sb: SupabaseClient, id: string, motivo: string): Promise<void> {
  await sb.from(TABELA).update({ status: "failed", error: motivo }).eq("id", id);
}

export async function decidir(
  sb: SupabaseClient,
  id: string,
  decisao: "scheduled" | "rejected",
  quando?: string | null
): Promise<void> {
  const { error } = await sb
    .from(TABELA)
    .update({
      status: decisao,
      scheduled_at: decisao === "scheduled" ? (quando ?? null) : null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending"); // só decide o que ainda está pendente
  if (error) throw new Error(`fila: ${error.message}`);
}
