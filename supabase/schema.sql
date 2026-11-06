-- Run this in the Supabase SQL Editor.
-- Portfolio content is publicly readable; only user IDs explicitly inserted in admin_users can edit it.

create table if not exists public.portfolio_content (
  id text primary key check (id = 'main'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.portfolio_content enable row level security;
alter table public.admin_users enable row level security;

grant select on public.portfolio_content to anon, authenticated;
grant insert, update on public.portfolio_content to authenticated;
grant select on public.admin_users to authenticated;

-- Public visitors can read the published portfolio.
drop policy if exists "Portfolio is public" on public.portfolio_content;
create policy "Portfolio is public" on public.portfolio_content
  for select using (true);

-- Only an administrator explicitly added by the project owner can create/update the portfolio row.
drop policy if exists "Admins can insert portfolio" on public.portfolio_content;
create policy "Admins can insert portfolio" on public.portfolio_content
  for insert to authenticated
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "Admins can update portfolio" on public.portfolio_content;
create policy "Admins can update portfolio" on public.portfolio_content
  for update to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

-- An authenticated user may only see their own admin membership; no client insert/update/delete policy exists.
drop policy if exists "Users can see own admin membership" on public.admin_users;
create policy "Users can see own admin membership" on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- Public asset bucket for portfolio images, résumé, and certificate previews.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-assets', 'portfolio-assets', true, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 10485760;

drop policy if exists "Portfolio assets are publicly readable" on storage.objects;
create policy "Portfolio assets are publicly readable" on storage.objects
  for select using (bucket_id = 'portfolio-assets');

drop policy if exists "Admins can upload portfolio assets" on storage.objects;
create policy "Admins can upload portfolio assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portfolio-assets' and exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "Admins can update portfolio assets" on storage.objects;
create policy "Admins can update portfolio assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'portfolio-assets' and exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (bucket_id = 'portfolio-assets' and exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "Admins can delete portfolio assets" on storage.objects;
create policy "Admins can delete portfolio assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio-assets' and exists (select 1 from public.admin_users where user_id = auth.uid()));

-- Bootstrap after creating your account in Supabase Authentication > Users:
-- 1. Copy the UUID of your user.
-- 2. Run this as the project owner in the SQL editor (replace the UUID):
-- insert into public.admin_users (user_id) values ('YOUR-AUTH-USER-UUID');

-- Enable live updates so open portfolio pages can refresh when an admin saves changes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portfolio_content'
  ) then
    alter publication supabase_realtime add table public.portfolio_content;
  end if;
end $$;
