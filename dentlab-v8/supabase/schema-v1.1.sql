-- =========================================================
-- DentLab Pro — v1.1 additions
-- Run this AFTER schema.sql (idempotent, safe to re-run)
-- Adds: subscriptions, currency per lab
-- =========================================================

-- ---------- SUBSCRIPTIONS ----------
-- One row per lab. You (super-admin) control it.
-- Status values: 'trial', 'active', 'expired', 'suspended'
create table if not exists public.subscriptions (
  lab_id      uuid primary key references public.labs(id) on delete cascade,
  status      text not null default 'trial' check (status in ('trial','active','expired','suspended')),
  plan        text default 'basic',            -- 'basic', 'pro', 'enterprise' — free text for flexibility
  starts_at   date default current_date,
  expires_at  date,                             -- null = unlimited
  notes       text,                             -- your internal notes about this customer
  max_users   int default 5,                    -- optional: limit users per plan
  amount      numeric default 0,                -- monthly/yearly price
  currency    text default 'DZD',
  billing_cycle text default 'monthly' check (billing_cycle in ('monthly','yearly','lifetime')),
  last_payment_at date,
  updated_at  timestamptz default now()
);

-- Payment history (so you can track who paid what and when)
create table if not exists public.subscription_payments (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references public.labs(id) on delete cascade,
  amount     numeric not null,
  currency   text default 'DZD',
  paid_at    date default current_date,
  method     text,                              -- 'cash','bank','wire','other'
  note       text,
  created_at timestamptz default now()
);

alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

-- Lab members can READ their own subscription (to show status banner)
drop policy if exists "sub read" on public.subscriptions;
create policy "sub read" on public.subscriptions
  for select using ( lab_id = public.my_lab() );

-- Lab members cannot INSERT/UPDATE/DELETE their subscription — only you (super-admin).
-- You edit subscriptions via the Supabase dashboard directly, or via your own "super admin" app
-- that uses the service_role key. For v1 that's the simplest: manage from Supabase Table editor.

-- Payments: same thing — read-only for the lab, you insert from Supabase dashboard
drop policy if exists "subpay read" on public.subscription_payments;
create policy "subpay read" on public.subscription_payments
  for select using ( lab_id = public.my_lab() );

-- ---------- Auto-create a trial subscription when a new lab signs up ----------
create or replace function public.create_trial_subscription() returns trigger
language plpgsql security definer as $$
begin
  insert into public.subscriptions(lab_id, status, plan, starts_at, expires_at, notes)
  values (new.id, 'trial', 'trial', current_date, current_date + interval '14 days', 'Auto-created trial')
  on conflict (lab_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_lab_created on public.labs;
create trigger on_lab_created
  after insert on public.labs
  for each row execute procedure public.create_trial_subscription();

-- ---------- Helper: check if my lab's subscription is active ----------
create or replace function public.is_subscription_active() returns boolean
language sql stable security definer as $$
  select coalesce(
    (select
       status in ('trial','active')
       and (expires_at is null or expires_at >= current_date)
     from public.subscriptions
     where lab_id = public.my_lab()),
    false
  );
$$;

-- ---------- Add currency to lab_settings ----------
alter table public.lab_settings add column if not exists currency text default 'DZD';

-- ---------- Developer branding (single row, globally configurable) ----------
-- You edit this once via Supabase SQL editor to set your name/phone for all labs.
create table if not exists public.app_branding (
  id         int primary key default 1,
  dev_name   text,
  dev_phone  text,
  dev_email  text,
  dev_site   text,
  constraint branding_single check (id = 1)
);
insert into public.app_branding(id) values (1) on conflict do nothing;

alter table public.app_branding enable row level security;
create policy "branding read" on public.app_branding for select using ( true );

-- =========================================================
-- How you manage subscriptions (3 ways, pick one):
-- =========================================================

-- OPTION A — Directly in Supabase Table Editor (simplest, no code):
--   1. Go to Supabase dashboard → Table Editor → subscriptions
--   2. Find the lab_id (join with labs table to see the name)
--   3. Change status / expires_at / plan as needed
--   4. The app will immediately enforce it on next page load.

-- OPTION B — Run SQL commands (faster for bulk):
--
--   -- Activate a lab for 1 year:
--   update subscriptions
--     set status='active', expires_at = current_date + interval '1 year', plan='pro', amount=12000, currency='DZD'
--   where lab_id = (select id from labs where name = 'Labo XYZ');
--
--   -- Suspend a lab (they see "compte suspendu" immediately):
--   update subscriptions set status='suspended' where lab_id = '...';
--
--   -- Record a payment:
--   insert into subscription_payments(lab_id, amount, currency, method, note)
--   values ('<lab-uuid>', 12000, 'DZD', 'cash', 'Renouvellement 2026');

-- OPTION C — Build a super-admin panel (later). It would use the service_role key
-- and be hosted separately so only you access it.
