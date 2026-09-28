-- ============================================================
-- Tabela de compras (relaciona usuário logado com ebooks)
-- ============================================================
create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ebook_id bigint references public.ebooks(id) on delete cascade not null,
  criado_em timestamp with time zone default now(),
  unique (user_id, ebook_id)
);

-- Liga a segurança por linha (RLS)
alter table public.compras enable row level security;

-- Cada pessoa só pode VER as próprias compras
create policy "Usuário vê só as próprias compras"
on public.compras for select
using (auth.uid() = user_id);

-- Cada pessoa só pode CRIAR compra pra si mesma
create policy "Usuário registra a própria compra"
on public.compras for insert
with check (auth.uid() = user_id);