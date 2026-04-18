-- =========================================================
-- DentLab Pro — v1.2 schema additions
-- Run AFTER schema.sql and schema-v1.1.sql (safe to re-run)
-- Adds: stock movement extra fields, purchase extra fields,
--        expense categories, technician payments
-- =========================================================

-- ── 1. Stock movements: extra fields for Entrée/Sortie ──
alter table public.stock_movements
  add column if not exists fournisseur     text,
  add column if not exists sous_traitant   text,
  add column if not exists date_mouvement  date default current_date,
  add column if not exists reference       text,
  add column if not exists num_lot         text;

-- ── 2. Supplier purchases: add unit, unit_price, reference, lot, note ──
alter table public.supplier_purchases
  add column if not exists unit            text default 'pcs',
  add column if not exists unit_price      numeric default 0,
  add column if not exists reference       text,
  add column if not exists num_lot         text,
  add column if not exists note            text;

-- ── 3. Expense categories (per lab) ──
create table if not exists public.expense_categories (
  lab_id  uuid references public.labs(id) on delete cascade,
  name    text not null,
  primary key (lab_id, name)
);
alter table public.expense_categories enable row level security;
create policy "exp_cats all" on public.expense_categories
  for all using (lab_id = public.my_lab() and public.is_admin())
  with check (lab_id = public.my_lab());

-- ── 4. Technician payments (balance tracking) ──
create table if not exists public.technician_payments (
  id             uuid primary key default gen_random_uuid(),
  lab_id         uuid references public.labs(id) on delete cascade,
  technician_id  uuid references public.profiles(id) on delete cascade,
  date           date default current_date,
  amount         numeric not null,
  note           text,
  created_at     timestamptz default now()
);
alter table public.technician_payments enable row level security;
create policy "tech_pay all" on public.technician_payments
  for all using (lab_id = public.my_lab())
  with check (lab_id = public.my_lab() and public.is_admin());

-- ── 5. Edge Function stub (for admin password reset) ──
-- Deploy supabase/functions/admin-update-user/index.ts with service_role key
-- to allow admins to change user passwords via the Users page.
-- See README for deployment instructions.

-- =========================================================
-- HOW TO RUN:
--   Supabase dashboard → SQL Editor → paste this file → Run
-- =========================================================

-- ── 6. Font family in lab_settings ──
alter table public.lab_settings add column if not exists font_family text default 'Inter';
