-- A fila. Um post por linha, do rascunho ao que foi ao ar.
--
-- `source_ref` é texto opaco de propósito: sem chave estrangeira para a sua
-- tabela. Assim a fila não precisa conhecer o seu domínio, e apagar um item de
-- origem não derruba o histórico do que já foi publicado.

create table if not exists public.postgate_queue (
  id uuid primary key default gen_random_uuid(),
  source_ref text,
  link_url text not null,
  image_url text,
  video_url text,
  caption text not null,
  kind text not null default 'feed' check (kind in ('feed', 'story', 'reel')),
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'posted', 'rejected', 'failed')),
  scheduled_at timestamptz,
  telegram_message_id bigint,
  media_id text,
  error text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists postgate_queue_status_idx
  on public.postgate_queue (status, scheduled_at nulls first);

-- Evita o mesmo item voltar para aprovação em toda execução do gerador.
create index if not exists postgate_queue_source_ref_idx
  on public.postgate_queue (source_ref) where source_ref is not null;

-- Só o backend (service role) acessa. Nenhuma policy para anon/authenticated:
-- a fila carrega rascunho não aprovado, que não deve ser público por acidente.
alter table public.postgate_queue enable row level security;
