create index if not exists lead_activities_created_by_idx
  on public.lead_activities (created_by)
  where created_by is not null;
