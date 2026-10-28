-- Lead Hub CRM migration
-- Direct client access is intentionally blocked. The Vercel API validates the CRM admin
-- session, then uses the server-only Supabase service key for CRM operations.

alter table public.leads
  add column if not exists phone text,
  add column if not exists source text not null default 'facebook',
  add column if not exists landing_page_url text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists pipeline_stage text not null default 'new',
  add column if not exists score_fit smallint not null default 0,
  add column if not exists score_intent smallint not null default 0,
  add column if not exists score_engagement smallint not null default 0,
  add column if not exists score_total smallint not null default 0,
  add column if not exists score_reason text not null default 'Chưa đủ dữ liệu để chấm điểm.',
  add column if not exists next_action text,
  add column if not exists last_interaction_at timestamptz,
  add column if not exists last_interaction_type text;

update public.leads
set pipeline_stage = 'new'
where pipeline_stage is null or pipeline_stage not in ('new', 'contacted', 'qualified', 'booked', 'won', 'not_fit');

alter table public.leads drop constraint if exists leads_pipeline_stage_check;
alter table public.leads add constraint leads_pipeline_stage_check check (pipeline_stage in ('new', 'contacted', 'qualified', 'booked', 'won', 'not_fit'));
alter table public.leads drop constraint if exists leads_score_fit_check;
alter table public.leads add constraint leads_score_fit_check check (score_fit between 0 and 100);
alter table public.leads drop constraint if exists leads_score_intent_check;
alter table public.leads add constraint leads_score_intent_check check (score_intent between 0 and 100);
alter table public.leads drop constraint if exists leads_score_engagement_check;
alter table public.leads add constraint leads_score_engagement_check check (score_engagement between 0 and 100);
alter table public.leads drop constraint if exists leads_score_total_check;
alter table public.leads add constraint leads_score_total_check check (score_total between 0 and 100);

create unique index if not exists leads_email_lower_unique_idx
  on public.leads (lower(email))
  where email is not null and btrim(email) <> '';

create unique index if not exists leads_phone_unique_idx
  on public.leads (phone)
  where phone is not null and btrim(phone) <> '';

create index if not exists leads_pipeline_stage_score_idx
  on public.leads (pipeline_stage, score_total desc, created_at desc);
create index if not exists leads_source_idx on public.leads (source);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_type text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists lead_activities_lead_created_idx
  on public.lead_activities (lead_id, created_at desc);

create or replace function public.touch_lead_interaction()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.leads
  set last_interaction_at = new.created_at,
      last_interaction_type = new.activity_type,
      updated_at = timezone('utc', now())
  where id = new.lead_id;
  return new;
end;
$$;

drop trigger if exists lead_activities_touch_lead on public.lead_activities;
create trigger lead_activities_touch_lead
after insert on public.lead_activities
for each row execute function public.touch_lead_interaction();

create or replace function public.touch_lead_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
before update on public.leads
for each row execute function public.touch_lead_updated_at();

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

revoke all on table public.leads from anon, authenticated;
revoke all on table public.lead_activities from anon, authenticated;
grant all on table public.leads to service_role;
grant all on table public.lead_activities to service_role;

drop policy if exists "No direct client access to leads" on public.leads;
create policy "No direct client access to leads"
  on public.leads for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "No direct client access to lead activities" on public.lead_activities;
create policy "No direct client access to lead activities"
  on public.lead_activities for all
  to anon, authenticated
  using (false)
  with check (false);

revoke execute on function public.touch_lead_interaction() from anon, authenticated;
revoke execute on function public.touch_lead_updated_at() from anon, authenticated;
