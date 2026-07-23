
create table if not exists public.insurance_policy_documents (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid null,
  policy_id uuid not null references public.insurance_policies(id) on delete cascade,
  carrier_id uuid null references public.insurance_carriers(id) on delete set null,
  version int not null default 1,
  is_current boolean not null default true,
  document_type text not null default 'policy',
  filename text not null,
  storage_path text not null,
  mime text null,
  size_bytes bigint null,
  notes text null,
  uploaded_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.insurance_policy_documents to authenticated;
grant all on public.insurance_policy_documents to service_role;

alter table public.insurance_policy_documents enable row level security;

create policy "tenant read own policy documents"
  on public.insurance_policy_documents for select to authenticated
  using (
    admin_id = public.get_tenant_admin_id(auth.uid())
    or public.is_super_admin(auth.uid())
  );

create policy "super admin manage policy documents"
  on public.insurance_policy_documents for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

create policy "tenant admin insert own policy documents"
  on public.insurance_policy_documents for insert to authenticated
  with check (
    admin_id = public.get_tenant_admin_id(auth.uid())
    or public.is_super_admin(auth.uid())
  );

create index if not exists idx_ipd_policy on public.insurance_policy_documents(policy_id, version desc);
create index if not exists idx_ipd_admin on public.insurance_policy_documents(admin_id);

create trigger trg_ipd_updated_at
  before update on public.insurance_policy_documents
  for each row execute function public.set_updated_at();
