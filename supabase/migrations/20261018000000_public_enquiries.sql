create table if not exists public.client_enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('booking', 'training')),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 30),
  beauty_service text check (
    beauty_service is null
    or beauty_service in ('Hair braiding', 'Eyelash extensions', 'Hair installation', 'Nail services')
  ),
  requested_date date,
  age_group text check (age_group is null or age_group in ('under_18', '18_or_over')),
  consent boolean not null check (consent),
  created_at timestamptz not null default now(),
  constraint client_enquiries_fields_match_kind check (
    (
      kind = 'booking'
      and beauty_service is not null
      and requested_date is not null
      and age_group is null
    )
    or (
      kind = 'training'
      and beauty_service is null
      and requested_date is null
      and age_group is not null
    )
  )
);

alter table public.client_enquiries enable row level security;
revoke all on table public.client_enquiries from public, anon, authenticated;

create table if not exists public.edge_rate_limits (
  bucket text primary key check (char_length(bucket) = 64),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0)
);

alter table public.edge_rate_limits enable row level security;
revoke all on table public.edge_rate_limits from public, anon, authenticated;
create index if not exists edge_rate_limits_window_started_at_idx
  on public.edge_rate_limits (window_started_at);

create or replace function public.consume_edge_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  current_time timestamptz := clock_timestamp();
begin
  if p_bucket !~ '^[0-9a-f]{64}$'
    or p_limit < 1
    or p_window_seconds < 1
    or p_window_seconds > 86400
  then
    raise exception 'Invalid rate limit parameters';
  end if;

  delete from public.edge_rate_limits
  where window_started_at < current_time - interval '1 day';

  insert into public.edge_rate_limits (bucket, window_started_at, request_count)
  values (p_bucket, current_time, 1)
  on conflict (bucket) do update
  set
    window_started_at = case
      when public.edge_rate_limits.window_started_at
        + make_interval(secs => p_window_seconds) <= current_time
      then current_time
      else public.edge_rate_limits.window_started_at
    end,
    request_count = case
      when public.edge_rate_limits.window_started_at
        + make_interval(secs => p_window_seconds) <= current_time
      then 1
      else public.edge_rate_limits.request_count + 1
    end
  returning request_count into current_count;

  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_edge_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text, integer, integer)
  to service_role;
