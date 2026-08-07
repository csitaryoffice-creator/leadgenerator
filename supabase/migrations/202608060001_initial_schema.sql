create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.search_job_status as enum (
  'queued',
  'running',
  'paused',
  'completed',
  'cancelled',
  'failed'
);

create type public.search_task_status as enum (
  'queued',
  'running',
  'completed',
  'cancelled',
  'failed'
);

create type public.website_condition as enum (
  'any',
  'with_website',
  'without_google_website'
);

create type public.crawl_status as enum (
  'not_started',
  'queued',
  'running',
  'found',
  'not_found',
  'timeout',
  'non_html',
  'blocked',
  'dns_error',
  'invalid_url',
  'failed'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  google_place_id text,
  google_resource_name text,
  display_name text not null,
  normalized_name text generated always as (lower(regexp_replace(display_name, '\s+', ' ', 'g'))) stored,
  primary_category text,
  categories text[] not null default '{}',
  business_status text,
  formatted_address text,
  country text,
  region text,
  city text,
  postal_code text,
  street text,
  street_number text,
  phone_local text,
  phone_international text,
  normalized_phone text,
  website_url text,
  website_domain text,
  google_maps_url text,
  rating numeric(3, 2),
  rating_count integer,
  latitude double precision,
  longitude double precision,
  source text not null default 'manual' check (source in ('manual', 'google', 'import')),
  google_fetched_at timestamptz,
  google_cache_expires_at timestamptz,
  email_crawl_status public.crawl_status not null default 'not_started',
  email_crawl_checked_at timestamptz,
  email_crawl_error text,
  email_count integer not null default 0,
  contact_page_url text,
  field_sources jsonb not null default '{}'::jsonb,
  manual_overrides jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index businesses_owner_place_unique
  on public.businesses (owner_id, google_place_id)
  where google_place_id is not null;

create index businesses_owner_deleted_idx on public.businesses (owner_id, deleted_at, updated_at desc);
create index businesses_owner_city_idx on public.businesses (owner_id, country, region, city);
create index businesses_owner_website_idx on public.businesses (owner_id, website_domain);
create index businesses_owner_name_idx on public.businesses using gin (to_tsvector('simple', coalesce(display_name, '') || ' ' || coalesce(formatted_address, '')));

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create table public.business_emails (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  email citext not null,
  normalized_email citext generated always as (lower(email::text)::citext) stored,
  source_url text,
  source text not null default 'website' check (source in ('website', 'manual', 'import')),
  is_primary boolean not null default false,
  discovered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index business_emails_unique_email
  on public.business_emails (business_id, normalized_email);

create unique index business_emails_one_primary
  on public.business_emails (business_id)
  where is_primary;

create index business_emails_owner_idx on public.business_emails (owner_id, email);

create trigger business_emails_set_updated_at
before update on public.business_emails
for each row execute function public.set_updated_at();

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete set null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (owner_id, parent_id, name)
);

create index folders_owner_parent_idx on public.folders (owner_id, parent_id, sort_order);

create trigger folders_set_updated_at
before update on public.folders
for each row execute function public.set_updated_at();

create table public.lead_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (owner_id, folder_id, name)
);

create index lead_lists_owner_folder_idx on public.lead_lists (owner_id, folder_id);

create trigger lead_lists_set_updated_at
before update on public.lead_lists
for each row execute function public.set_updated_at();

create table public.business_lists (
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  list_id uuid not null references public.lead_lists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, list_id)
);

create index business_lists_owner_idx on public.business_lists (owner_id, list_id);

create table public.business_folders (
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  folder_id uuid not null references public.folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, folder_id)
);

create index business_folders_owner_idx on public.business_folders (owner_id, folder_id);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  filters jsonb not null default '{}'::jsonb,
  sorting jsonb not null default '[]'::jsonb,
  column_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (owner_id, name)
);

create trigger saved_views_set_updated_at
before update on public.saved_views
for each row execute function public.set_updated_at();

create table public.search_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status public.search_job_status not null default 'queued',
  params jsonb not null,
  category text not null,
  desired_count integer not null check (desired_count > 0),
  country text not null,
  region text,
  city text,
  website_condition public.website_condition not null default 'any',
  target_folder_id uuid references public.folders(id) on delete set null,
  target_list_id uuid references public.lead_lists(id) on delete set null,
  auto_email_crawl boolean not null default true,
  started_at timestamptz,
  finished_at timestamptz,
  processed_tasks_count integer not null default 0,
  raw_records_count integer not null default 0,
  excluded_records_count integer not null default 0,
  saved_businesses_count integer not null default 0,
  duplicate_businesses_count integer not null default 0,
  crawled_websites_count integer not null default 0,
  found_emails_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index search_jobs_owner_status_idx on public.search_jobs (owner_id, status, created_at desc);

create trigger search_jobs_set_updated_at
before update on public.search_jobs
for each row execute function public.set_updated_at();

create table public.search_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.search_jobs(id) on delete cascade,
  task_key text not null,
  status public.search_task_status not null default 'queued',
  params jsonb not null,
  attempt_count integer not null default 0,
  next_run_at timestamptz not null default now(),
  locked_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, task_key)
);

create index search_tasks_ready_idx on public.search_tasks (status, next_run_at, created_at);
create index search_tasks_owner_job_idx on public.search_tasks (owner_id, job_id);

create trigger search_tasks_set_updated_at
before update on public.search_tasks
for each row execute function public.set_updated_at();

create table public.api_usage_months (
  owner_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  monthly_limit integer not null default 900,
  used_count integer not null default 0 check (used_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, month_start)
);

create table public.api_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  endpoint text not null,
  billing_category text not null,
  used_count integer not null default 0 check (used_count >= 0),
  monthly_limit integer not null default 900,
  updated_at timestamptz not null default now(),
  unique (owner_id, month_start, endpoint, billing_category)
);

create index api_usage_owner_month_idx on public.api_usage (owner_id, month_start desc);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  status text not null default 'previewed' check (status in ('previewed', 'imported', 'failed')),
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger import_jobs_set_updated_at
before update on public.import_jobs
for each row execute function public.set_updated_at();

create or replace function public.reserve_google_api_usage(
  p_owner_id uuid,
  p_endpoint text,
  p_billing_category text,
  p_monthly_limit integer,
  p_units integer default 1
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_new_total integer;
begin
  if p_units <= 0 then
    raise exception 'p_units must be positive';
  end if;

  insert into public.api_usage_months (owner_id, month_start, monthly_limit, used_count)
  values (p_owner_id, v_month, p_monthly_limit, 0)
  on conflict (owner_id, month_start)
  do update set monthly_limit = excluded.monthly_limit;

  update public.api_usage_months
  set used_count = used_count + p_units,
      monthly_limit = p_monthly_limit,
      updated_at = now()
  where owner_id = p_owner_id
    and month_start = v_month
    and used_count + p_units <= p_monthly_limit
  returning used_count into v_new_total;

  if v_new_total is null then
    return false;
  end if;

  insert into public.api_usage (
    owner_id,
    month_start,
    endpoint,
    billing_category,
    used_count,
    monthly_limit
  )
  values (
    p_owner_id,
    v_month,
    p_endpoint,
    p_billing_category,
    p_units,
    p_monthly_limit
  )
  on conflict (owner_id, month_start, endpoint, billing_category)
  do update set used_count = public.api_usage.used_count + excluded.used_count,
                monthly_limit = excluded.monthly_limit,
                updated_at = now();

  return true;
end;
$$;

revoke all on function public.reserve_google_api_usage(uuid, text, text, integer, integer) from public;
grant execute on function public.reserve_google_api_usage(uuid, text, text, integer, integer) to service_role;

create or replace function public.claim_search_task()
returns public.search_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.search_tasks;
begin
  select *
  into v_task
  from public.search_tasks
  where status = 'queued'
    and next_run_at <= now()
  order by created_at
  for update skip locked
  limit 1;

  if v_task.id is null then
    return null;
  end if;

  update public.search_tasks
  set status = 'running',
      locked_at = now(),
      started_at = coalesce(started_at, now()),
      attempt_count = attempt_count + 1
  where id = v_task.id
  returning * into v_task;

  update public.search_jobs
  set status = 'running',
      started_at = coalesce(started_at, now())
  where id = v_task.job_id
    and status in ('queued', 'paused');

  return v_task;
end;
$$;

revoke all on function public.claim_search_task() from public;
grant execute on function public.claim_search_task() to service_role;

create or replace function public.recount_job_completion(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open_count integer;
  v_failed_count integer;
begin
  select count(*) into v_open_count
  from public.search_tasks
  where job_id = p_job_id and status in ('queued', 'running');

  select count(*) into v_failed_count
  from public.search_tasks
  where job_id = p_job_id and status = 'failed';

  if v_open_count = 0 then
    update public.search_jobs
    set status = case when v_failed_count > 0 then 'failed'::public.search_job_status else 'completed'::public.search_job_status end,
        finished_at = now()
    where id = p_job_id
      and status not in ('cancelled', 'completed');
  end if;
end;
$$;

revoke all on function public.recount_job_completion(uuid) from public;
grant execute on function public.recount_job_completion(uuid) to service_role;

create or replace function public.increment_search_job_counters(
  p_job_id uuid,
  p_processed_tasks integer default 0,
  p_raw_records integer default 0,
  p_excluded_records integer default 0,
  p_saved_businesses integer default 0,
  p_duplicate_businesses integer default 0,
  p_crawled_websites integer default 0,
  p_found_emails integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.search_jobs
  set processed_tasks_count = processed_tasks_count + p_processed_tasks,
      raw_records_count = raw_records_count + p_raw_records,
      excluded_records_count = excluded_records_count + p_excluded_records,
      saved_businesses_count = saved_businesses_count + p_saved_businesses,
      duplicate_businesses_count = duplicate_businesses_count + p_duplicate_businesses,
      crawled_websites_count = crawled_websites_count + p_crawled_websites,
      found_emails_count = found_emails_count + p_found_emails
  where id = p_job_id;
end;
$$;

revoke all on function public.increment_search_job_counters(uuid, integer, integer, integer, integer, integer, integer, integer) from public;
grant execute on function public.increment_search_job_counters(uuid, integer, integer, integer, integer, integer, integer, integer) to service_role;

alter table public.businesses enable row level security;
alter table public.business_emails enable row level security;
alter table public.folders enable row level security;
alter table public.lead_lists enable row level security;
alter table public.business_lists enable row level security;
alter table public.business_folders enable row level security;
alter table public.saved_views enable row level security;
alter table public.search_jobs enable row level security;
alter table public.search_tasks enable row level security;
alter table public.api_usage_months enable row level security;
alter table public.api_usage enable row level security;
alter table public.import_jobs enable row level security;

create policy businesses_owner_select on public.businesses
for select to authenticated using ((select auth.uid()) = owner_id);
create policy businesses_owner_insert on public.businesses
for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy businesses_owner_update on public.businesses
for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy businesses_owner_delete on public.businesses
for delete to authenticated using ((select auth.uid()) = owner_id);

create policy business_emails_owner_all on public.business_emails
for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy folders_owner_all on public.folders
for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy lead_lists_owner_all on public.lead_lists
for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy business_lists_owner_all on public.business_lists
for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy business_folders_owner_all on public.business_folders
for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy saved_views_owner_all on public.saved_views
for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy search_jobs_owner_all on public.search_jobs
for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy search_tasks_owner_select on public.search_tasks
for select to authenticated using ((select auth.uid()) = owner_id);

create policy api_usage_months_owner_select on public.api_usage_months
for select to authenticated using ((select auth.uid()) = owner_id);

create policy api_usage_owner_select on public.api_usage
for select to authenticated using ((select auth.uid()) = owner_id);

create policy import_jobs_owner_all on public.import_jobs
for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
