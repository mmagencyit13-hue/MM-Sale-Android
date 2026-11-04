-- Additive read-only graph calculation; does not update entries or existing report functions.
begin;
create or replace function public.mma646_dashboard_graph(p_token text,p_args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 ctx jsonb; authz jsonb; sch text:='public'; seg text:=coalesce(p_args->>'segment','readymade');
 f date:=(p_args->>'from')::date; t date:=(p_args->>'to')::date;
 co text:=coalesce(p_args->>'company_id',''); cat text:=lower(coalesce(p_args->>'category',''));
 rows jsonb; cur jsonb; prev jsonb; fullprev jsonb; fy integer;
begin
 if f is null or t is null or f>t or t-f>366 then raise exception 'Invalid graph dates';end if;
 if cat not in ('','city','outer','fabric') then raise exception 'Invalid category';end if;
 ctx:=public.mma548_context(p_token);
 if ctx->>'access'='grey' then seg:='grey';end if;
 if seg not in ('readymade','grey') then raise exception 'Invalid segment';end if;
 if seg='grey' then
  if coalesce(ctx->>'access','') not in ('grey','both') then raise exception 'Grey access denied';end if;
  sch:='mma_grey';
 end if;
 -- Existing owner authentication and financial permissions remain the authorization source.
 execute format('select %I.erp502_ceo($1,''catalog'',''{}''::jsonb)',sch) into authz using p_token;
 if authz->>'build'<>'502' or authz->>'actor' is null
 or coalesce((authz#>>'{permissions,sale,show}')::boolean,false) is not true
 or coalesce((authz#>>'{permissions,sale,click}')::boolean,false) is not true then raise exception 'Financial dashboard permission required';end if;
 if co<>'' and not exists(select 1 from jsonb_array_elements(coalesce(authz->'companies','[]')) c where c->>'id'=co) then raise exception 'Company not available';end if;
 execute format($q$
 with ledger as (
  select to_jsonb(h) j,coalesce(nullif(to_jsonb(l)->>'ledger_date',''),to_jsonb(h)->>'ledger_date') d,
   upper(regexp_replace(coalesce(to_jsonb(l)->>'particular',''),'[[:space:]/-]+','_','g')) p,
   upper(coalesce(to_jsonb(l)->>'voucher_type','')) v,
   case when upper(to_jsonb(l)->>'entry_type')='DEBIT' then round(coalesce((to_jsonb(l)->>'amount')::numeric,0)*100) else 0 end dr,
   case when upper(to_jsonb(l)->>'entry_type')='CREDIT' then round(coalesce((to_jsonb(l)->>'amount')::numeric,0)*100) else 0 end cr
  from %1$I.ledger_entries h join %1$I.ledger_entry_lines l on l.ledger_entry_id=h.id
 ), tagged as (
  select j,left(d,10) d,case
   when p like '%%DISCOUNT%%' or v like '%%DISCOUNT%%' then 'discount'
   when p like '%%SALE_RETURN%%' or p='GR' or v like '%%CREDIT NOTE%%' or v like '%%CREDIT_NOTE%%' then 'returns'
   when p='RECEIPT' or v like '%%RECEIPT%%' or v='PAYMENT' then 'ledger_receipt'
   when p='SALE' or v like '%%SALES%%' then 'ledger_sale' else 'other' end kind,dr,cr
  from ledger
  union all select to_jsonb(x),left(coalesce(nullif(to_jsonb(x)->>'invoice_bill_date',''),to_jsonb(x)->>'invoice_date'),10),'invoice',round(coalesce((to_jsonb(x)->>'total_amount')::numeric,0)*100),0 from %1$I.sale_invoices x
  union all select to_jsonb(x),left(to_jsonb(x)->>'receipt_date',10),'payment',0,round(coalesce((to_jsonb(x)->>'amount')::numeric,0)*100) from %1$I.payments x
 ), scoped as (
  select x.*,to_jsonb(b) b,to_jsonb(s) s,
   lower(coalesce(nullif(x.j->>'crm_category',''),nullif(to_jsonb(b)->>'crm_category',''),nullif(to_jsonb(s)->>'crm_category',''),'')) tag
  from tagged x left join %1$I.buyers b on b.id::text=x.j->>'buyer_id' left join %1$I.suppliers s on s.id::text=x.j->>'supplier_id'
  where x.d between $1 and $2 and kind<>'other'
 ), filtered as (
  select * from scoped where ($3='' or coalesce(nullif(j->>'company_id',''),nullif(j->>'print_company_id',''),s->>'print_company_id')=$3)
  and ($4='' or case when tag in ('city','outer','fabric') then tag
   when concat_ws(' ',j->>'buyer_city',b->>'city',j->>'supplier_city_outer',s->>'city_outer') ilike '%%fabric%%' then 'fabric'
   when concat_ws(' ',j->>'buyer_city',b->>'city',j->>'supplier_city_outer',s->>'city_outer') ~* 'jaipur|city' then 'city' else 'outer' end=$4)
 )
 select coalesce(jsonb_agg(jsonb_build_object('month',m,'invoice',invoice/100,'ledger_sale',ledger_sale/100,'payment',payment/100,'ledger_receipt',ledger_receipt/100,'sales',(invoice+ledger_sale)/100,'receipt',(payment+ledger_receipt)/100,'returns',returns/100,'discount',discount/100) order by m),'[]')
 from (select left(d,7) m,
  coalesce(sum(dr) filter(where kind='invoice'),0) invoice,
  coalesce(sum(dr) filter(where kind='ledger_sale'),0) ledger_sale,
  coalesce(sum(cr-dr) filter(where kind='payment'),0) payment,
  coalesce(sum(cr-dr) filter(where kind='ledger_receipt'),0) ledger_receipt,
  coalesce(sum(cr-dr) filter(where kind='returns'),0) returns,
  coalesce(sum(cr-dr) filter(where kind='discount'),0) discount
  from filtered group by left(d,7)) monthly
 $q$,sch) into rows using f::text,t::text,co,cat;
 -- Calendar-day bounds are applied before grouping, including same-period comparisons.
 -- Calculate previous elapsed and full-FY comparison independently from the same sources.
 cur:=public.mma646_graph_period(rows,f,t);
 prev:=null;fullprev:=null;
 if coalesce((p_args->>'comparison')::boolean,false) and not coalesce((p_args->>'internal_previous646')::boolean,false) then
  prev:=public.mma646_dashboard_graph(p_token,p_args||jsonb_build_object('from',(f-interval '1 year')::date,'to',(t-interval '1 year')::date,'comparison',false,'internal_previous646',true));
  fy:=extract(year from f)::int-case when extract(month from f)<4 then 1 else 0 end;
  fullprev:=public.mma646_dashboard_graph(p_token,p_args||jsonb_build_object('from',make_date(fy-1,4,1),'to',make_date(fy,3,31),'comparison',false,'internal_previous646',true));
 end if;
 return cur||jsonb_build_object('build',646,'actor',authz->>'actor','from',f,'to',t,'comparison',prev,'comparison_full',fullprev);
end $$;

create or replace function public.mma646_graph_period(p_months jsonb,p_from date,p_to date)
returns jsonb language sql immutable set search_path=public,pg_temp as $$
 with m as (select x from jsonb_array_elements(p_months) x where x->>'month' between left(p_from::text,7) and left(p_to::text,7))
 select jsonb_build_object('monthly',coalesce((select jsonb_agg(x order by x->>'month') from m),'[]'),
 'totals',jsonb_build_object('sales',coalesce((select sum((x->>'sales')::numeric) from m),0),'receipt',coalesce((select sum((x->>'receipt')::numeric) from m),0),'returns',coalesce((select sum((x->>'returns')::numeric) from m),0),'discount',coalesce((select sum((x->>'discount')::numeric) from m),0)),
 'sources',jsonb_build_object('invoice',coalesce((select sum((x->>'invoice')::numeric) from m),0),'ledger_sale',coalesce((select sum((x->>'ledger_sale')::numeric) from m),0),'payment',coalesce((select sum((x->>'payment')::numeric) from m),0),'ledger_receipt',coalesce((select sum((x->>'ledger_receipt')::numeric) from m),0)))
$$;
revoke all on function public.mma646_dashboard_graph(text,jsonb),public.mma646_graph_period(jsonb,date,date) from public;
grant execute on function public.mma646_dashboard_graph(text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
