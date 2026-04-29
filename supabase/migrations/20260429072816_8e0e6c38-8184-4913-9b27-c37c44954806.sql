create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  hostname text not null unique,
  display_name text,
  brand_id uuid references public.brands(id) on delete set null,
  sub_store_id uuid references public.sub_stores(id) on delete set null,
  status text not null default 'pending',
  ssl_status text not null default 'pending',
  is_primary boolean not null default false,
  notes text,
  last_scraped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.domains enable row level security;

create policy "Admin manage domains"
  on public.domains for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create policy "Public read active domains"
  on public.domains for select to anon, authenticated
  using (status = 'active');

create trigger trg_domains_updated_at
  before update on public.domains
  for each row execute function public.update_updated_at_column();

create index if not exists idx_domains_brand on public.domains(brand_id);
create index if not exists idx_domains_substore on public.domains(sub_store_id);