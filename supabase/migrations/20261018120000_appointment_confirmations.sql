alter table public.client_enquiries
  add column if not exists requested_time time,
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists status text not null default 'pending',
  add column if not exists decided_at timestamptz,
  add column if not exists decision_token_hash text;

alter table public.client_enquiries
  drop constraint if exists client_enquiries_status_check,
  add constraint client_enquiries_status_check
    check (status in ('pending', 'confirmed', 'declined'));

alter table public.client_enquiries
  drop constraint if exists client_enquiries_decision_token_hash_check,
  add constraint client_enquiries_decision_token_hash_check
    check (decision_token_hash is null or decision_token_hash ~ '^[0-9a-f]{64}$');

alter table public.client_enquiries
  drop constraint if exists client_enquiries_booking_time_check,
  add constraint client_enquiries_booking_time_check
    check (kind = 'booking' or (requested_time is null and not whatsapp_opt_in));

create index if not exists client_enquiries_status_idx
  on public.client_enquiries (status, requested_date);
