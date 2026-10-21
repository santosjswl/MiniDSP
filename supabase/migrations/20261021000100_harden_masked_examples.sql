-- Hardens scan_findings for databases that applied an earlier revision of
-- 20261021000000_scans_findings.sql, whose masked_example check accepted raw values.

begin;

-- Remove synthetic test rows that fail the strict masked shape (cascades to their findings).
delete from public.scans s
where exists (
  select 1 from public.scan_findings f
  where f.scan_id = s.id
    and not (
      case f.finding_type
        when 'email' then f.masked_example ~ '^[^@[:space:]]\*\*\*@[[:alnum:]]([[:alnum:]-]*[[:alnum:]])?(\.[[:alnum:]]([[:alnum:]-]*[[:alnum:]])?)+$'
        when 'uk_phone' then f.masked_example ~ '^(0[1237]\*{6}|\+44\*{7})[0-9]{3}$'
        when 'uk_nino' then f.masked_example ~ '^[A-Z]{2}\*{6}[A-D]?$'
        when 'payment_card' then f.masked_example ~ '^\*{9,15}[0-9]{4}$'
        else false
      end
    )
);

-- Drop any earlier check constraints on masked_example or risk, whatever their generated names.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.scan_findings'::regclass
      and contype = 'c'
      and (pg_get_constraintdef(oid) like '%masked_example%'
           or pg_get_constraintdef(oid) like '%finding_type%risk%'
           or pg_get_constraintdef(oid) like '%risk%finding_type%')
      and pg_get_constraintdef(oid) not like '%ANY%'
  loop
    execute format('alter table public.scan_findings drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.scan_findings
  add constraint scan_findings_masked_example_shape check (
    case finding_type
      when 'email' then masked_example ~ '^[^@[:space:]]\*\*\*@[[:alnum:]]([[:alnum:]-]*[[:alnum:]])?(\.[[:alnum:]]([[:alnum:]-]*[[:alnum:]])?)+$'
      when 'uk_phone' then masked_example ~ '^(0[1237]\*{6}|\+44\*{7})[0-9]{3}$'
      when 'uk_nino' then masked_example ~ '^[A-Z]{2}\*{6}[A-D]?$'
      when 'payment_card' then masked_example ~ '^\*{9,15}[0-9]{4}$'
      else false
    end
  ),
  add constraint scan_findings_risk_matches_type check (
    risk = case finding_type
      when 'email' then 'Low'
      when 'uk_phone' then 'Medium'
      when 'uk_nino' then 'High'
      when 'payment_card' then 'Critical'
    end
  );

commit;
