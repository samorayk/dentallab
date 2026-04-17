-- =========================================================
-- DentLab Pro - Multi-tenant Supabase schema
-- Each lab is isolated. Users belong to exactly one lab.
-- Run in Supabase SQL editor.
-- =========================================================

create extension if not exists "pgcrypto";

create table if not exists public.labs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid,
  logo        text, address text, phone text, nif text, nis text, rc text,
  created_at  timestamptz default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  lab_id      uuid references public.labs(id) on delete cascade,
  role        text not null check (role in ('admin','dentist','technician')),
  name        text not null,
  phone       text, clinic text,
  stages      text[] default '{}',
  prices      jsonb  default '{}'::jsonb,
  color       text default '#2D6A4F',
  avatar      text default 'U',
  created_at  timestamptz default now()
);
create index if not exists profiles_lab_idx on public.profiles(lab_id);

create table if not exists public.stages (
  id      text,
  lab_id  uuid references public.labs(id) on delete cascade,
  label   text not null, color text, bg text, ord int default 0,
  primary key (lab_id, id)
);

create table if not exists public.prosthesis_types (
  id      uuid primary key default gen_random_uuid(),
  lab_id  uuid references public.labs(id) on delete cascade,
  name    text not null, elems int default 1, price numeric default 0,
  unique (lab_id, name)
);

create table if not exists public.cases (
  id           text,
  lab_id       uuid references public.labs(id) on delete cascade,
  patient      text not null,
  dentist_id   uuid references public.profiles(id),
  type text, material text, tooth text, shade text,
  priority     text default 'medium' check (priority in ('low','medium','high')),
  stage        text default 'attente',
  elements     int default 1,
  unit_price   numeric default 0,
  total_price  numeric default 0,
  paid         boolean default false,
  notes        text,
  files        jsonb default '[]'::jsonb,
  teinte_photo text,
  delivery     jsonb default '{"status":"pending","driverName":"","driverPhone":"","deliveredAt":""}'::jsonb,
  assignments  jsonb default '{}'::jsonb,
  log          jsonb default '[]'::jsonb,
  due          date,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  primary key (lab_id, id)
);
create index if not exists cases_dentist_idx on public.cases(dentist_id);
create index if not exists cases_stage_idx   on public.cases(lab_id, stage);

create table if not exists public.stock (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid references public.labs(id) on delete cascade,
  name text not null, category text, qty numeric default 0, min_qty numeric default 0,
  unit text default 'pcs', price numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid references public.labs(id) on delete cascade,
  item_id uuid references public.stock(id) on delete cascade,
  type text check (type in ('in','out')), qty numeric not null, note text,
  created_at timestamptz default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid references public.labs(id) on delete cascade,
  name text not null, contact text, phone text, email text,
  created_at timestamptz default now()
);

create table if not exists public.supplier_purchases (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid references public.labs(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,
  date date default current_date, item text not null, qty numeric default 1,
  total numeric default 0, paid boolean default false
);

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid references public.labs(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,
  date date default current_date, amount numeric not null, note text
);

create table if not exists public.dentist_payments (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid references public.labs(id) on delete cascade,
  dentist_id uuid references public.profiles(id) on delete cascade,
  date date default current_date, amount numeric not null, note text
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid references public.labs(id) on delete cascade,
  category text, label text, amount numeric default 0, date date default current_date
);

create table if not exists public.lab_settings (
  lab_id uuid primary key references public.labs(id) on delete cascade,
  lang text default 'fr', font_size numeric default 13, theme_color text default '#2D6A4F'
);

-- Helpers
create or replace function public.my_lab() returns uuid language sql stable security definer as $$
  select lab_id from public.profiles where id = auth.uid();
$$;
create or replace function public.my_role() returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- RLS
alter table public.labs enable row level security;
alter table public.profiles enable row level security;
alter table public.stages enable row level security;
alter table public.prosthesis_types enable row level security;
alter table public.cases enable row level security;
alter table public.stock enable row level security;
alter table public.stock_movements enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_purchases enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.dentist_payments enable row level security;
alter table public.expenses enable row level security;
alter table public.lab_settings enable row level security;

create policy "labs read"   on public.labs for select using ( id = public.my_lab() );
create policy "labs insert" on public.labs for insert with check ( true );
create policy "labs update" on public.labs for update using ( id = public.my_lab() and public.is_admin() );

create policy "profiles read"   on public.profiles for select using ( lab_id = public.my_lab() or id = auth.uid() );
create policy "profiles insert" on public.profiles for insert with check ( id = auth.uid() or (lab_id = public.my_lab() and public.is_admin()) );
create policy "profiles update" on public.profiles for update using ( id = auth.uid() or (lab_id = public.my_lab() and public.is_admin()) );
create policy "profiles delete" on public.profiles for delete using ( lab_id = public.my_lab() and public.is_admin() );

create policy "stages all"   on public.stages             for all using ( lab_id = public.my_lab() ) with check ( lab_id = public.my_lab() );
create policy "types all"    on public.prosthesis_types   for all using ( lab_id = public.my_lab() ) with check ( lab_id = public.my_lab() );
create policy "cases all"    on public.cases              for all using ( lab_id = public.my_lab() ) with check ( lab_id = public.my_lab() );
create policy "stock all"    on public.stock              for all using ( lab_id = public.my_lab() ) with check ( lab_id = public.my_lab() );
create policy "mov all"      on public.stock_movements    for all using ( lab_id = public.my_lab() ) with check ( lab_id = public.my_lab() );
create policy "sup all"      on public.suppliers          for all using ( lab_id = public.my_lab() and public.is_admin() ) with check ( lab_id = public.my_lab() );
create policy "sp all"       on public.supplier_purchases for all using ( lab_id = public.my_lab() and public.is_admin() ) with check ( lab_id = public.my_lab() );
create policy "spay all"     on public.supplier_payments  for all using ( lab_id = public.my_lab() and public.is_admin() ) with check ( lab_id = public.my_lab() );
create policy "dp all"       on public.dentist_payments   for all using ( lab_id = public.my_lab() ) with check ( lab_id = public.my_lab() and public.is_admin() );
create policy "exp all"      on public.expenses           for all using ( lab_id = public.my_lab() and public.is_admin() ) with check ( lab_id = public.my_lab() );
create policy "settings all" on public.lab_settings       for all using ( lab_id = public.my_lab() ) with check ( lab_id = public.my_lab() );

-- Storage
insert into storage.buckets (id, name, public) values ('case-files','case-files', true) on conflict do nothing;
create policy "files read" on storage.objects for select using ( bucket_id = 'case-files' );
create policy "files write" on storage.objects for insert with check ( bucket_id = 'case-files' and auth.uid() is not null );
create policy "files update" on storage.objects for update using ( bucket_id = 'case-files' and auth.uid() is not null );
create policy "files delete" on storage.objects for delete using ( bucket_id = 'case-files' and auth.uid() is not null );

-- Signup trigger: admin creates new lab + seeds defaults
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare v_lab_id uuid; v_lab_name text; v_role text; v_name text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role','admin');
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1));
  v_lab_name := new.raw_user_meta_data->>'lab_name';

  if v_role = 'admin' and v_lab_name is not null then
    insert into public.labs(name, owner_id) values (v_lab_name, new.id) returning id into v_lab_id;
    insert into public.stages(lab_id,id,label,color,bg,ord) values
      (v_lab_id,'attente','En attente','#D97706','#FEF3C7',1),
      (v_lab_id,'conception','Conception','#7C3AED','#EDE9FE',2),
      (v_lab_id,'fraisage','Fraisage','#2563EB','#DBEAFE',3),
      (v_lab_id,'impression','Impression','#0891B2','#CFFAFE',4),
      (v_lab_id,'four','Four','#EA580C','#FFF7ED',5),
      (v_lab_id,'maquillage','Maquillage','#DB2777','#FCE7F3',6),
      (v_lab_id,'termine','Terminé','#059669','#D1FAE5',7);
    insert into public.prosthesis_types(lab_id,name,elems,price) values
      (v_lab_id,'Couronne',1,8500),(v_lab_id,'Bridge',3,7500),
      (v_lab_id,'Facette',1,9000),(v_lab_id,'Inlay',1,6000);
    insert into public.lab_settings(lab_id) values (v_lab_id);
    insert into public.profiles(id,lab_id,role,name) values (new.id,v_lab_id,'admin',v_name);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();
