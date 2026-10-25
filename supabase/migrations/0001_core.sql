-- Gestion Médicale: socle initial. À appliquer uniquement sur un projet de développement.
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum (
    'super_admin','clinic_admin','doctor','nurse','receptionist',
    'lab_technician','pharmacist','cashier','accountant','radiologist','auditor'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_status as enum ('pending','active','suspended','revoked');
exception when duplicate_object then null; end $$;

create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  registration_number text,
  phone text,
  email text,
  address text,
  city text,
  country_code char(2) not null default 'GN',
  currency_code char(3) not null default 'GNF',
  timezone text not null default 'Africa/Conakry',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null,
  phone text,
  preferred_language text not null default 'fr',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.app_role not null,
  status public.membership_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (establishment_id, user_id, role)
);

create index if not exists memberships_user_status_idx
  on public.memberships(user_id, establishment_id, status);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  employee_number text not null,
  department text,
  job_title text,
  professional_license text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (establishment_id, employee_number),
  unique (establishment_id, profile_id),
  unique (establishment_id, id)
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete restrict,
  patient_number text not null,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  sex_at_birth text check (sex_at_birth in ('female','male','intersex','unknown')),
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (establishment_id, patient_number),
  unique (establishment_id, id)
);

create index if not exists patients_name_idx
  on public.patients(establishment_id, last_name, first_name);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete restrict,
  patient_id uuid not null,
  practitioner_id uuid not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  reason text,
  status text not null default 'scheduled' check (status in (
    'scheduled','confirmed','arrived','in_progress','completed','cancelled','no_show'
  )),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (establishment_id, id),
  check (scheduled_end > scheduled_start),
  foreign key (establishment_id, patient_id)
    references public.patients(establishment_id, id) on delete restrict,
  foreign key (establishment_id, practitioner_id)
    references public.staff(establishment_id, id) on delete restrict
);

create index if not exists appointments_calendar_idx
  on public.appointments(establishment_id, practitioner_id, scheduled_start);

create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete restrict,
  patient_id uuid not null,
  appointment_id uuid,
  practitioner_id uuid not null,
  encounter_type text not null default 'consultation',
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  chief_complaint text,
  clinical_summary text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (establishment_id, id),
  foreign key (establishment_id, patient_id)
    references public.patients(establishment_id, id) on delete restrict,
  foreign key (establishment_id, practitioner_id)
    references public.staff(establishment_id, id) on delete restrict,
  foreign key (establishment_id, appointment_id)
    references public.appointments(establishment_id, id) on delete restrict
);

create table if not exists public.vital_signs (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete restrict,
  encounter_id uuid not null,
  temperature_c numeric(4,1),
  systolic_bp integer,
  diastolic_bp integer,
  heart_rate integer,
  respiratory_rate integer,
  oxygen_saturation numeric(5,2),
  weight_kg numeric(6,2),
  height_cm numeric(6,2),
  measured_by uuid not null references public.profiles(id) on delete restrict,
  measured_at timestamptz not null default now(),
  foreign key (establishment_id, encounter_id)
    references public.encounters(establishment_id, id) on delete restrict
);

create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete restrict,
  encounter_id uuid not null,
  code_system text,
  diagnosis_code text,
  description text not null,
  is_primary boolean not null default false,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (establishment_id, encounter_id)
    references public.encounters(establishment_id, id) on delete restrict
);

create table if not exists public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete restrict,
  encounter_id uuid not null,
  note_type text not null,
  content text not null,
  status text not null default 'draft' check (status in ('draft','signed','amended')),
  author_id uuid not null references public.profiles(id) on delete restrict,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (establishment_id, encounter_id)
    references public.encounters(establishment_id, id) on delete restrict
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  occurred_at timestamptz not null default now(),
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

-- RLS activée : aucun accès n'est accordé tant que les politiques spécifiques ne sont pas installées.
alter table public.establishments enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.staff enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.encounters enable row level security;
alter table public.vital_signs enable row level security;
alter table public.diagnoses enable row level security;
alter table public.clinical_notes enable row level security;
alter table public.audit_logs enable row level security;

-- Fonction de lecture des rôles actifs; aucun droit de modification des adhésions n'est accordé ici.
create or replace function public.has_clinic_role(
  p_establishment_id uuid,
  p_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.establishment_id = p_establishment_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any(p_roles)
  );
$$;

revoke all on function public.has_clinic_role(uuid, public.app_role[]) from public, anon;
grant execute on function public.has_clinic_role(uuid, public.app_role[]) to authenticated;

create policy profiles_read_self
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy memberships_read_self
on public.memberships for select to authenticated
using (user_id = (select auth.uid()));

create policy establishments_read_member
on public.establishments for select to authenticated
using (
  public.has_clinic_role(
    id,
    array['super_admin','clinic_admin','doctor','nurse','receptionist',
    'lab_technician','pharmacist','cashier','accountant','radiologist','auditor']::public.app_role[]
  )
);

create policy staff_read_member
on public.staff for select to authenticated
using (
  public.has_clinic_role(
    establishment_id,
    array['super_admin','clinic_admin','doctor','nurse','receptionist',
    'lab_technician','pharmacist','cashier','accountant','radiologist','auditor']::public.app_role[]
  )
);

create policy patients_read_authorized
on public.patients for select to authenticated
using (
  public.has_clinic_role(
    establishment_id,
    array['super_admin','clinic_admin','doctor','nurse','receptionist',
    'lab_technician','pharmacist','cashier','accountant','radiologist','auditor']::public.app_role[]
  )
);

create policy patients_insert_authorized
on public.patients for insert to authenticated
with check (
  public.has_clinic_role(
    establishment_id,
    array['super_admin','clinic_admin','doctor','nurse','receptionist']::public.app_role[]
  )
);

create policy patients_update_authorized
on public.patients for update to authenticated
using (
  public.has_clinic_role(
    establishment_id,
    array['super_admin','clinic_admin','doctor','nurse','receptionist']::public.app_role[]
  )
)
with check (
  public.has_clinic_role(
    establishment_id,
    array['super_admin','clinic_admin','doctor','nurse','receptionist']::public.app_role[]
  )
);

create policy appointments_read_authorized
on public.appointments for select to authenticated
using (
  public.has_clinic_role(
    establishment_id,
    array['super_admin','clinic_admin','doctor','nurse','receptionist']::public.app_role[]
  )
);

create policy encounters_read_authorized
on public.encounters for select to authenticated
using (
  public.has_clinic_role(
    establishment_id,
    array['super_admin','clinic_admin','doctor','nurse']::public.app_role[]
  )
);

create policy clinical_notes_read_authorized
on public.clinical_notes for select to authenticated
using (
  public.has_clinic_role(
    establishment_id,
    array['super_admin','clinic_admin','doctor','nurse']::public.app_role[]
  )
);

-- Les autres tables médicales et l'audit restent fermées tant que leurs politiques dédiées ne sont pas ajoutées.
