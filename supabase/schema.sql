-- LinkPulse MVP schema. Run in the Supabase SQL Editor.
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  destination_url text not null,
  created_at timestamptz not null default now(),
  click_count bigint not null default 0,
  constraint links_code_format check (code ~ '^[A-Za-z0-9_-]{3,64}$'),
  constraint links_destination_http check (destination_url ~* '^https?://[^[:space:]]+$'),
  constraint links_click_count_nonnegative check (click_count >= 0)
);

create index if not exists links_created_at_idx
  on public.links (created_at desc);

alter table public.links enable row level security;

-- This unauthenticated MVP exposes stored links to the public dashboard.
-- Inserts are restricted to the fields the app needs; clicks are incremented
-- only through the function below, never by a direct UPDATE grant.
revoke all on table public.links from anon, authenticated;
grant select on table public.links to anon, authenticated;
grant insert (code, destination_url) on table public.links to anon, authenticated;

 drop policy if exists "links are publicly readable" on public.links;
create policy "links are publicly readable"
  on public.links for select
  to anon, authenticated
  using (true);

drop policy if exists "valid links can be created" on public.links;
create policy "valid links can be created"
  on public.links for insert
  to anon, authenticated
  with check (
    char_length(code) between 3 and 64
    and code ~ '^[A-Za-z0-9_-]+$'
    and destination_url ~* '^https?://[^[:space:]]+$'
  );

create or replace function public.increment_link_click(p_code text)
returns bigint
language sql
security definer
set search_path = ''
as $$
  update public.links
  set click_count = click_count + 1
  where code = p_code
  returning click_count;
$$;

revoke all on function public.increment_link_click(text) from public;
grant execute on function public.increment_link_click(text) to anon, authenticated;

-- Return exact aggregates without fetching every link through the REST API.
create or replace function public.get_link_analytics()
returns table(total_links bigint, total_clicks numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint, coalesce(sum(click_count), 0)::numeric
  from public.links;
$$;

revoke all on function public.get_link_analytics() from public;
grant execute on function public.get_link_analytics() to anon, authenticated;
