-- Run before V673 deployment. Updates the existing read-only Buddy supplier RPC.
begin;

create or replace function public.mma671_buddy_supplier_outstanding(p_token text, p_args jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  actor jsonb;
  role_label text;
  business text := coalesce(p_args->>'segment','readymade');
  business_access text;
  schema_name text;
  supplier uuid;
  supplier_name text;
  query text := trim(coalesce(p_args->>'query',''));
  as_of date := (now() at time zone 'Asia/Kolkata')::date;
  fy_start date := make_date(extract(year from as_of)::int - case when extract(month from as_of)<4 then 1 else 0 end, 4, 1);
  result jsonb;
begin
  actor := public.erp_employee_session_v332(p_token);
  if actor->>'id' is null or coalesce(actor->>'kind','') not in ('employee','admin') then
    raise exception 'Please sign in to MM Buddy';
  end if;
  if actor->>'kind' = 'employee' then
    select r.role_name into role_label
    from public.erp_employees e join public.team_roles r on r.id=e.role_id
    where e.id=(actor->>'id')::uuid;
    if nullif(trim(role_label),'') is null or trim(regexp_replace(role_label,'[_-]+',' ','g')) ~* '^sales?[[:space:]]*executive\M' then
      raise exception 'Supplier Outstanding is unavailable for this designation';
    end if;
  end if;

  business_access := public.mma548_context(p_token)->>'access';
  if business not in ('readymade','grey') then raise exception 'Invalid business segment'; end if;
  if coalesce(business_access,'') not in ('readymade','grey','both') then raise exception 'Business access unavailable'; end if;
  if business_access = 'grey' then business := 'grey'; end if;
  if business = 'grey' and coalesce(business_access,'') not in ('both','grey') then
    raise exception 'Grey business access denied';
  end if;
  schema_name := case when business='grey' then 'mma_grey' else 'public' end;

  if nullif(p_args->>'supplier_id','') is null then
    if length(query) < 4 or length(query) > 120 then raise exception 'Enter 4 to 120 characters of the supplier name'; end if;
    execute format($search$
      select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(s) order by s.name,s.id),'[]'))
      from (select id, company_name as name, city
            from %I.suppliers
            where strpos(lower(company_name),lower($1)) > 0
            order by company_name,id limit 50) s
    $search$,schema_name) into result using query;
    return result;
  end if;

  supplier := (p_args->>'supplier_id')::uuid;
  execute format('select company_name from %I.suppliers where id=$1',schema_name) into supplier_name using supplier;
  if supplier_name is null then raise exception 'Supplier unavailable'; end if;
  execute format($report$
WITH h AS MATERIALIZED (
   SELECT t.id,t.buyer_id,t.supplier_id,t.ledger_date::text d,coalesce(to_jsonb(t)->>'source','') src,
    round(coalesce((to_jsonb(t)->>'debit_amount')::numeric,0)*100) dr,round(coalesce((to_jsonb(t)->>'credit_amount')::numeric,0)*100) cr
   FROM %1$I.ledger_entries t WHERE t.supplier_id=$1 AND t.ledger_date<=$2::date
  ),hist AS (SELECT DISTINCT buyer_id,supplier_id FROM h WHERE src='HISTORICAL_IMPORT_2025_26'),
  heads AS MATERIALIZED (SELECT h.* FROM h WHERE NOT (src LIKE 'FY_ROLLOVER_%%' AND EXISTS(SELECT 1 FROM hist x WHERE x.buyer_id IS NOT DISTINCT FROM h.buyer_id AND x.supplier_id=h.supplier_id))),
  lines AS MATERIALIZED (
   SELECT h.*,coalesce(nullif(to_jsonb(l)->>'ledger_date',''),h.d) ld,
    upper(regexp_replace(coalesce(to_jsonb(l)->>'particular',''),'[[:space:]/-]+','_','g')) p,upper(coalesce(to_jsonb(l)->>'voucher_type','')) v,
    CASE WHEN upper(to_jsonb(l)->>'entry_type')='DEBIT' THEN round(coalesce((to_jsonb(l)->>'amount')::numeric,0)*100) ELSE 0 END ldr,
    CASE WHEN upper(to_jsonb(l)->>'entry_type')='CREDIT' THEN round(coalesce((to_jsonb(l)->>'amount')::numeric,0)*100) ELSE 0 END lcr
   FROM heads h JOIN %1$I.ledger_entry_lines l ON l.ledger_entry_id=h.id
  ),ls AS (SELECT id,sum(ldr) dr,sum(lcr) cr FROM lines GROUP BY id),
  ledger AS (
   SELECT buyer_id,supplier_id,ld d,src,ldr dr,lcr cr,
    CASE WHEN p LIKE '%%DISCOUNT%%' OR v LIKE '%%DISCOUNT%%' THEN 'discount'
    WHEN p LIKE '%%SALE_RETURN%%' OR p='GR' OR v LIKE '%%CREDIT NOTE%%' OR v LIKE '%%CREDIT_NOTE%%' THEN 'gr'
    WHEN p='RECEIPT' OR v LIKE '%%RECEIPT%%' OR v='PAYMENT' THEN 'receipt'
    WHEN p='SALE' OR v LIKE '%%SALES%%' THEN 'sale'
    WHEN p LIKE '%%OPENING%%' OR p IN ('OB','O_B') OR v LIKE '%%OPENING%%' OR v IN ('OB','O/B') THEN 'opening' ELSE 'other' END kind FROM lines
   UNION ALL SELECT h.buyer_id,h.supplier_id,h.d,h.src,h.dr,h.cr,CASE WHEN h.src LIKE 'FY_ROLLOVER_%%' THEN 'opening' ELSE 'other' END FROM heads h LEFT JOIN ls ON ls.id=h.id WHERE ls.id IS NULL
   UNION ALL SELECT h.buyer_id,h.supplier_id,h.d,h.src,greatest(0,h.dr-ls.dr)+greatest(0,ls.cr-h.cr),greatest(0,h.cr-ls.cr)+greatest(0,ls.dr-h.dr),'other'
    FROM heads h JOIN ls ON ls.id=h.id WHERE abs(h.dr-ls.dr)>1 OR abs(h.cr-ls.cr)>1
  ),transactions AS (
   SELECT * FROM ledger
   UNION ALL SELECT buyer_id,supplier_id,coalesce(nullif(to_jsonb(t)->>'invoice_bill_date',''),to_jsonb(t)->>'invoice_date'), 'sale_invoices',round(coalesce((to_jsonb(t)->>'total_amount')::numeric,0)*100),0,'invoice' FROM %1$I.sale_invoices t WHERE t.supplier_id=$1
   UNION ALL SELECT buyer_id,supplier_id,receipt_date::text,'payments',0,round(coalesce((to_jsonb(t)->>'amount')::numeric,0)*100),'payment' FROM %1$I.payments t WHERE t.supplier_id=$1
  ),firsts AS (SELECT buyer_id,supplier_id,min(d) d FROM transactions WHERE src NOT LIKE 'FY_ROLLOVER_%%' GROUP BY buyer_id,supplier_id),
  effective AS (SELECT t.* FROM transactions t LEFT JOIN firsts f ON f.buyer_id IS NOT DISTINCT FROM t.buyer_id AND f.supplier_id=t.supplier_id WHERE t.d<=$2 AND NOT ((t.src LIKE 'FY_ROLLOVER_%%' OR (t.kind='opening' AND t.src='HISTORICAL_IMPORT_2025_26')) AND coalesce(f.d<left(t.d,4)||'-04-01',false))),
  balances as (
    select buyer_id,round(sum(dr-cr)/100,2) outstanding from effective group by buyer_id having sum(dr-cr)<>0
  ), named as (
    select coalesce(b.company_name,'Unassigned buyer') name,coalesce(b.city,'') city,a.outstanding
    from balances a left join %1$I.buyers b on b.id=a.buyer_id
  )
  select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(n) order by n.name,n.city) filter (where n.name is not null),'[]'),
    'total',coalesce(sum(n.outstanding),0),
    'opening',(select round(coalesce(sum(dr-cr),0)/100,2) from effective where d<$3 or kind='opening'),
    'total_bills',(select round(coalesce(sum(dr),0)/100,2) from effective where d>=$3 and kind in ('sale','invoice')),
    'last_received_date',last_payment.d,
    'last_received_amount',last_payment.amount,
    'days_since_received',$2::date-last_payment.d::date)
  from named n
  right join (select 1) seed on true
  left join lateral (
    select d, round(sum(cr)/100,2) amount
    from effective where d>=$3 and kind in ('receipt','payment') and cr>0
    group by d order by d desc limit 1
  ) last_payment on true
  group by last_payment.d,last_payment.amount
  $report$,schema_name) into result using supplier,as_of::text,fy_start::text;
  return result || jsonb_build_object('name',supplier_name,'as_of',as_of,
    'fy',extract(year from fy_start)::int::text || '–' || right((extract(year from fy_start)::int+1)::text,2));
end $$;

revoke all on function public.mma671_buddy_supplier_outstanding(text,jsonb) from public;
grant execute on function public.mma671_buddy_supplier_outstanding(text,jsonb) to anon, authenticated;
commit;
