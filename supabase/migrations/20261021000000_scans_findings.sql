create table public.scans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 255),
  file_type text not null check (file_type in ('csv','txt')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 1048576),
  overall_risk text not null check (overall_risk in ('None','Low','Medium','High','Critical')),
  total_findings integer not null check (total_findings >= 0),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.scan_findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  owner_id uuid not null default auth.uid(),
  finding_type text not null check (finding_type in ('email','uk_phone','uk_nino','payment_card')),
  risk text not null check (risk in ('Low','Medium','High','Critical')),
  match_count integer not null check (match_count > 0),
  masked_example text not null check (
    case finding_type
      when 'email' then masked_example ~ '^[^@[:space:]]\*\*\*@[[:alnum:]]([[:alnum:]-]*[[:alnum:]])?(\.[[:alnum:]]([[:alnum:]-]*[[:alnum:]])?)+$'
      when 'uk_phone' then masked_example ~ '^(0[1237]\*{6}|\+44\*{7})[0-9]{3}$'
      when 'uk_nino' then masked_example ~ '^[A-Z]{2}\*{6}[A-D]?$'
      when 'payment_card' then masked_example ~ '^\*{9,15}[0-9]{4}$'
      else false
    end
  ),
  check (risk = case finding_type
    when 'email' then 'Low'
    when 'uk_phone' then 'Medium'
    when 'uk_nino' then 'High'
    when 'payment_card' then 'Critical'
  end),
  unique (scan_id, finding_type),
  -- parent-child integrity: a finding's owner must equal its scan's owner
  foreign key (scan_id, owner_id) references public.scans(id, owner_id) on delete cascade
);

create index scans_owner_created_idx on public.scans(owner_id, created_at desc);
create index scan_findings_owner_idx on public.scan_findings(owner_id, finding_type, risk);

alter table public.scans enable row level security;
alter table public.scan_findings enable row level security;
revoke all on public.scans, public.scan_findings from anon, authenticated;
grant select, insert on public.scans, public.scan_findings to authenticated;

create policy scans_select_own on public.scans for select to authenticated using ((select auth.uid()) = owner_id);
create policy scans_insert_own on public.scans for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy findings_select_own on public.scan_findings for select to authenticated using ((select auth.uid()) = owner_id);
create policy findings_insert_own on public.scan_findings for insert to authenticated with check (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.scans s where s.id = scan_id and s.owner_id = (select auth.uid())));

-- Atomic save: one function call = one transaction. SECURITY INVOKER, so RLS still applies.
create function public.create_scan_with_findings(
  p_file_name text, p_file_type text, p_file_size_bytes integer, p_findings jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_scan_id uuid; v_total integer; v_risk text;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if jsonb_typeof(p_findings) <> 'array' then raise exception 'invalid findings' using errcode = '22023'; end if;
  select coalesce(sum((f->>'count')::integer), 0),
         coalesce((array['None','Low','Medium','High','Critical'])[max(array_position(array['None','Low','Medium','High','Critical'], f->>'risk'))], 'None')
    into v_total, v_risk from jsonb_array_elements(p_findings) f;
  insert into public.scans(owner_id, file_name, file_type, file_size_bytes, overall_risk, total_findings)
    values (v_uid, p_file_name, p_file_type, p_file_size_bytes, v_risk, v_total) returning id into v_scan_id;
  insert into public.scan_findings(scan_id, owner_id, finding_type, risk, match_count, masked_example)
    select v_scan_id, v_uid, f->>'type', f->>'risk', (f->>'count')::integer, f->>'maskedExample'
    from jsonb_array_elements(p_findings) f;
  return v_scan_id;
end $$;

revoke execute on function public.create_scan_with_findings(text,text,integer,jsonb) from public, anon;
grant execute on function public.create_scan_with_findings(text,text,integer,jsonb) to authenticated;
