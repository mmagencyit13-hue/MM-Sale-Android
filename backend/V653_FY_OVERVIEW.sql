-- V653 separate entry summary and FY transaction-date overview: one set-based transaction aggregation. No aging/ranking/party drill-down work.
begin;
create or replace function public.mma646_dashboard_graph(p_token text,p_args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 ctx jsonb;authz jsonb;sch text:='public';seg text:=coalesce(p_args->>'segment','readymade');
 f date:=(p_args->>'from')::date;t date:=(p_args->>'to')::date;
 co text:=coalesce(p_args->>'company_id','');cat text:=lower(coalesce(p_args->>'category',''));
 cur jsonb;prev jsonb;fullprev jsonb;fy integer;ld text;invoice_day text;head_json text;row_json text;scope text;head_day text;payment_day text;date_basis text:=coalesce(p_args->>'date_basis','entry');
begin
 if date_basis not in ('entry','transaction') then raise exception 'Invalid date basis';end if;
 if f is null or t is null or f>t or t-f>366 then raise exception 'Invalid graph dates';end if;
 if cat not in ('','city','outer','fabric') then raise exception 'Invalid category';end if;
 ctx:=public.mma548_context(p_token);
 if ctx->>'access'='grey' then seg:='grey';end if;
 if seg not in ('readymade','grey') then raise exception 'Invalid segment';end if;
 if seg='grey' then
  if coalesce(ctx->>'access','') not in ('grey','both') then raise exception 'Grey access denied';end if;
  sch:='mma_grey';
 end if;
 execute format('select %I.erp502_ceo($1,''catalog'',''{}''::jsonb)',sch) into authz using p_token;
 if coalesce(authz->>'build','')<>'502' or authz->>'actor' is null
 or coalesce((authz#>>'{permissions,sale,show}')::boolean,false) is not true
 or coalesce((authz#>>'{permissions,sale,click}')::boolean,false) is not true then raise exception 'Financial dashboard permission required';end if;
 if co<>'' and not exists(select 1 from jsonb_array_elements(coalesce(authz->'companies','[]')) c where c->>'id'=co) then raise exception 'Company not available';end if;
 ld:='h.d';
 -- Header uses Entry Date; FY overview uses the original transaction-date financial basis.
 ld:='h.d';invoice_day:='(x.created_at at time zone ''Asia/Kolkata'')::date';
 head_day:='(h.created_at at time zone ''Asia/Kolkata'')::date';payment_day:='(x.created_at at time zone ''Asia/Kolkata'')::date';
 if date_basis='transaction' then
  head_day:='h.ledger_date::date';payment_day:='x.receipt_date::date';
  if exists(select 1 from information_schema.columns where table_schema=sch and table_name='ledger_entry_lines' and column_name='ledger_date') then ld:='coalesce(l.ledger_date::date,h.d)';end if;
  if exists(select 1 from information_schema.columns where table_schema=sch and table_name='sale_invoices' and column_name='invoice_bill_date') then
   invoice_day:='x.invoice_bill_date::date';
   if exists(select 1 from information_schema.columns where table_schema=sch and table_name='sale_invoices' and column_name='invoice_date') then invoice_day:='coalesce(x.invoice_bill_date::date,x.invoice_date::date)';end if;
  else invoice_day:='x.invoice_date::date';end if;
 end if;
 -- The default All Companies / All Categories path avoids all master joins and row-wide JSON conversion.
 head_json:='''{}''::jsonb';row_json:=head_json;scope:='';
 if co<>'' or cat<>'' then
  head_json:='to_jsonb(h)';row_json:='to_jsonb(x)';
  scope:=format($filter$
   and ($3='' or coalesce(nullif(e.j->>'company_id',''),nullif(e.j->>'print_company_id',''),(select to_jsonb(s)->>'print_company_id' from %1$I.suppliers s where s.id=e.supplier_id))=$3)
   and ($4='' or (select case
    when lower(coalesce(nullif(e.j->>'crm_category',''),nullif(to_jsonb(b)->>'crm_category',''),nullif(to_jsonb(s)->>'crm_category',''),'')) in ('city','outer','fabric')
     then lower(coalesce(nullif(e.j->>'crm_category',''),nullif(to_jsonb(b)->>'crm_category',''),nullif(to_jsonb(s)->>'crm_category',''),''))
    when concat_ws(' ',e.j->>'buyer_city',to_jsonb(b)->>'city',e.j->>'supplier_city_outer',to_jsonb(s)->>'city_outer') ilike '%%fabric%%' then 'fabric'
    when concat_ws(' ',e.j->>'buyer_city',to_jsonb(b)->>'city',e.j->>'supplier_city_outer',to_jsonb(s)->>'city_outer') ~* 'jaipur|city' then 'city' else 'outer' end
    from (select 1) seed left join %1$I.buyers b on b.id=e.buyer_id left join %1$I.suppliers s on s.id=e.supplier_id)=$4)
  $filter$,sch);
 end if;
 execute format($q$
 with heads0 as materialized (
  select h.id,h.buyer_id,h.supplier_id,%8$s d,coalesce(h.source,'') src,
   round(coalesce(h.debit_amount,0)*100) dr,round(coalesce(h.credit_amount,0)*100) cr,%2$s j
  from %1$I.ledger_entries h
 ),history as (select distinct buyer_id,supplier_id from heads0 where src='HISTORICAL_IMPORT_2025_26'),
 heads as materialized (select h.* from heads0 h),
 lines as materialized (
  select h.id,h.buyer_id,h.supplier_id,%3$s d,h.src,h.j,
   upper(regexp_replace(coalesce(l.particular,''),'[[:space:]/-]+','_','g')) p,upper(coalesce(l.voucher_type,'')) v,
   case when upper(l.entry_type)='DEBIT' then round(coalesce(l.amount,0)*100) else 0 end dr,
   case when upper(l.entry_type)='CREDIT' then round(coalesce(l.amount,0)*100) else 0 end cr
  from heads h join %1$I.ledger_entry_lines l on l.ledger_entry_id=h.id
 ),used as (select id,sum(dr) dr,sum(cr) cr from lines group by id),
 ledger as (
  select buyer_id,supplier_id,d,src,j,dr,cr,case
   when v like '%%DISCOUNT%%' or (v='' and p like '%%DISCOUNT%%') then 'discount'
   when v like '%%SALE%%RETURN%%' or v like '%%CREDIT NOTE%%' or v like '%%CREDIT_NOTE%%' or (v='' and (p like '%%SALE_RETURN%%' or p='GR')) then 'returns'
   when v like '%%RECEIPT%%' or v='PAYMENT' or (v='' and p='RECEIPT') then 'ledger_receipt'
   when v='SALE' or v like '%%SALES%%' or (v='' and p='SALE') then 'ledger_sale'
   when v like '%%OPENING%%' or v in ('OB','O/B') or (v='' and (p like '%%OPENING%%' or p in ('OB','O_B'))) then 'opening' else 'other'  end kind,id entity_id from lines
  union all select h.buyer_id,h.supplier_id,h.d,h.src,h.j,h.dr,h.cr,case when h.src like 'FY_ROLLOVER_%%' then 'opening' else 'other' end,h.id from heads h left join used u on u.id=h.id where u.id is null
  union all select h.buyer_id,h.supplier_id,h.d,h.src,h.j,
   greatest(0,h.dr-u.dr)+greatest(0,u.cr-h.cr),greatest(0,h.cr-u.cr)+greatest(0,u.dr-h.dr),'other',h.id
   from heads h join used u on u.id=h.id where abs(h.dr-u.dr)>1 or abs(h.cr-u.cr)>1
 ),allrows as materialized (
  select * from ledger
  union all select x.buyer_id,x.supplier_id,%4$s,'sale_invoices',%5$s,round(coalesce(x.total_amount,0)*100),0,'invoice',x.id from %1$I.sale_invoices x
  union all select x.buyer_id,x.supplier_id,%7$s,'payments',%5$s,0,round(coalesce(x.amount,0)*100),'payment',x.id from %1$I.payments x
 ),raw_entries as materialized (
  select buyer_id,supplier_id,d,j,id entity_id,'ledger' kind,dr+cr amount from heads0
  union all select x.buyer_id,x.supplier_id,%4$s,%5$s,x.id,'invoice',round(coalesce(x.total_amount,0)*100) from %1$I.sale_invoices x
  union all select x.buyer_id,x.supplier_id,%7$s,%5$s,x.id,'payment',round(coalesce(x.amount,0)*100) from %1$I.payments x
 ),raw_selected as materialized (select e.* from raw_entries e where e.d between $1 and $2 %6$s
 ),firsts as (select buyer_id,supplier_id,min(d) d from allrows where src not like 'FY_ROLLOVER_%%' group by buyer_id,supplier_id),
 effective as materialized (
  select e.* from allrows e left join firsts a on a.buyer_id=e.buyer_id and a.supplier_id=e.supplier_id
  where e.d<=$2 and not(e.kind='opening' and (e.src like 'FY_ROLLOVER_%%' or e.src='HISTORICAL_IMPORT_2025_26') and coalesce(a.d<make_date(extract(year from e.d)::int,4,1),false)) and not(e.kind='opening' and e.src like 'FY_ROLLOVER_%%' and exists(select 1 from history z where z.buyer_id=e.buyer_id and z.supplier_id=e.supplier_id)) %6$s
 ),monthly as (
  select to_char(d,'YYYY-MM') m,
   count(distinct entity_id) filter(where kind='invoice') invoice_count,
   count(distinct entity_id) filter(where kind='ledger_sale') ledger_sale_count,
   count(distinct entity_id) filter(where kind='payment') payment_count,
   count(distinct entity_id) filter(where kind='ledger_receipt') ledger_receipt_count,
   coalesce(sum(dr) filter(where kind='invoice'),0) invoice,
   coalesce(sum(dr) filter(where kind='ledger_sale'),0) ledger_sale,
   coalesce(sum(cr-dr) filter(where kind='payment'),0) payment,
   coalesce(sum(cr-dr) filter(where kind='ledger_receipt'),0) ledger_receipt,
   coalesce(sum(cr-dr) filter(where kind='returns'),0) returns,
   coalesce(sum(cr-dr) filter(where kind='discount'),0) discount
  from effective where d between $1 and $2 and kind<>'opening' group by to_char(d,'YYYY-MM')
 )
 select jsonb_build_object('monthly',coalesce((select jsonb_agg(jsonb_build_object('month',m,'sales',(invoice+ledger_sale)/100,'receipt',(payment+ledger_receipt)/100,'returns',returns/100,'discount',discount/100) order by m) from monthly),'[]'),
 'totals',jsonb_build_object('sales',coalesce((select sum(invoice+ledger_sale)/100 from monthly),0),'receipt',coalesce((select sum(payment+ledger_receipt)/100 from monthly),0),'returns',coalesce((select sum(returns)/100 from monthly),0),'discount',coalesce((select sum(discount)/100 from monthly),0),'opening',coalesce((select sum(dr-cr)/100 from effective where d<$1 or kind='opening'),0)),
 'total620',jsonb_build_object('count',(select count(*) from raw_selected),'amount',coalesce((select sum(amount)/100 from raw_selected),0)),
 'entries620',jsonb_build_object(
  'sale',jsonb_build_object('amount',coalesce((select sum(invoice+ledger_sale)/100 from monthly),0),'count',coalesce((select sum(invoice_count+ledger_sale_count) from monthly),0)),
  'payment',jsonb_build_object('amount',coalesce((select sum(payment+ledger_receipt)/100 from monthly),0),'count',coalesce((select sum(payment_count+ledger_receipt_count) from monthly),0)),
  'ledger',jsonb_build_object('amount',coalesce((select sum(amount)/100 from raw_selected where kind='ledger'),0),'count',(select count(*) from raw_selected where kind='ledger'))),
 'sources',jsonb_build_object('invoice',coalesce((select sum(invoice)/100 from monthly),0),'ledger_sale',coalesce((select sum(ledger_sale)/100 from monthly),0),'payment',coalesce((select sum(payment)/100 from monthly),0),'ledger_receipt',coalesce((select sum(ledger_receipt)/100 from monthly),0)))
 $q$,sch,head_json,ld,invoice_day,row_json,scope,payment_day,head_day) into cur using f,t,co,cat;
 if coalesce((p_args->>'comparison')::boolean,false) then
  prev:=public.mma646_dashboard_graph(p_token,p_args||jsonb_build_object('from',(f-interval '1 year')::date,'to',(t-interval '1 year')::date,'comparison',false));
  fy:=extract(year from f)::int-case when extract(month from f)<4 then 1 else 0 end;
  fullprev:=public.mma646_dashboard_graph(p_token,p_args||jsonb_build_object('from',make_date(fy-1,4,1),'to',make_date(fy,3,31),'comparison',false));
 end if;
 return cur||jsonb_build_object('build',646,'actor',authz->>'actor','from',f,'to',t,'date_basis',date_basis,'comparison',prev,'comparison_full',fullprev);
end $$;
revoke all on function public.mma646_dashboard_graph(text,jsonb) from public;
grant execute on function public.mma646_dashboard_graph(text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
