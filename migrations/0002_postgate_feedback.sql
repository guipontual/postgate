-- Por que um post foi recusado. Opcional, mas é o que impede o gerador de
-- repetir a mesma proposta amanhã — e o que transforma "recusei" em sinal.
create table if not exists public.postgate_feedback (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.postgate_queue (id) on delete cascade,
  motivo text not null,
  created_at timestamptz not null default now()
);

alter table public.postgate_feedback enable row level security;
