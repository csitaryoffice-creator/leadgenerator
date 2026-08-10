alter table public.businesses
  add column if not exists lead_status text not null default 'new',
  add column if not exists status_updated_at timestamptz not null default now(),
  add column if not exists contacted_at timestamptz;

alter table public.businesses
  drop constraint if exists businesses_lead_status_check;

alter table public.businesses
  add constraint businesses_lead_status_check
  check (lead_status in ('new', 'contacted', 'follow_up', 'interested', 'not_interested', 'converted'));

create index if not exists businesses_owner_status_idx
  on public.businesses (owner_id, lead_status, status_updated_at desc);
