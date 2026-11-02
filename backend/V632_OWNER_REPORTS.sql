-- V631 read-only Owner/Admin drill-down. No changes to existing dashboard/commission functions.
BEGIN;
CREATE OR REPLACE FUNCTION public.mma630_owner_data(p_token text,p_action text,p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE authz jsonb; ctx jsonb; perms jsonb; sec text; sch text:='public'; mode text; seg text;
 result jsonb:='{}'; arr jsonb; tbl text; names text[]; b text:=coalesce(p_args->>'buyer_id',''); s text:=coalesce(p_args->>'supplier_id','');
 from_day date:=coalesce(nullif(p_args->>'from','')::date,date_trunc('year',now())::date); to_day date:=coalesce(nullif(p_args->>'to','')::date,current_date);
 cond text; kind text; ids jsonb; bill_allowed jsonb; bill_page jsonb; pos integer;
BEGIN
 IF p_action NOT IN ('parties','finance','commission','pending_bills','pending_summary','pending_catalog','pending_page','crm_catalog','crm_page','tasks') THEN RAISE EXCEPTION 'Unsupported owner read action'; END IF;
 IF from_day>to_day THEN RAISE EXCEPTION 'Invalid date range'; END IF;
 IF (b<>'' AND b!~*'^[0-9a-f-]{36}$') OR (s<>'' AND s!~*'^[0-9a-f-]{36}$') THEN RAISE EXCEPTION 'Invalid party'; END IF;
 ctx:=public.mma548_context(p_token); mode:=ctx->>'access';seg:=coalesce(p_args->>'segment','readymade');
 IF seg NOT IN ('readymade','grey') THEN RAISE EXCEPTION 'Invalid business segment';END IF;
 IF mode='grey' THEN seg:='grey'; END IF;
 IF seg='grey' AND mode NOT IN ('grey','both') THEN RAISE EXCEPTION 'Grey business access denied'; END IF;
 IF seg='grey' THEN sch:='mma_grey'; END IF;
 -- Tasks are the existing shared staff task system, across desktop and mobile.
 IF p_action='tasks' THEN sch:='public'; END IF;
 EXECUTE format('SELECT %I.erp502_ceo($1,''catalog'',''{}''::jsonb)',sch) INTO authz USING p_token;
 IF authz->>'actor' IS NULL OR authz->>'build'<>'502' THEN RAISE EXCEPTION 'Owner authorization required';END IF;
 sec:=CASE p_action WHEN 'commission' THEN 'commission' WHEN 'pending_bills' THEN 'commission' WHEN 'pending_summary' THEN 'commission' WHEN 'pending_catalog' THEN 'commission' WHEN 'pending_page' THEN 'commission' WHEN 'crm_catalog' THEN CASE WHEN coalesce((p_args->>'report')::boolean,false) THEN 'outstanding' ELSE 'crm' END WHEN 'crm_page' THEN CASE WHEN coalesce((p_args->>'report')::boolean,false) THEN 'outstanding' ELSE 'crm' END WHEN 'tasks' THEN 'tasks' ELSE 'sale' END;
 perms:=authz->'permissions'->sec;
 IF coalesce((perms->>'show')::boolean,false) IS NOT TRUE OR coalesce((perms->>'click')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Owner % permission required',sec;END IF;
 IF p_action='pending_summary' THEN
  -- Aggregate on the server; return supplier names, never the entire transaction history.
  EXECUTE format($report$
  WITH h AS MATERIALIZED (
   SELECT t.id,t.buyer_id,t.supplier_id,t.ledger_date::text d,coalesce(to_jsonb(t)->>'source','') src,
    round(coalesce((to_jsonb(t)->>'debit_amount')::numeric,0)*100) dr,round(coalesce((to_jsonb(t)->>'credit_amount')::numeric,0)*100) cr
   FROM %1$I.ledger_entries t WHERE t.ledger_date::text<=$2
  ),hist AS (SELECT DISTINCT buyer_id,supplier_id FROM h WHERE src='HISTORICAL_IMPORT_2025_26'),
  heads AS MATERIALIZED (SELECT h.* FROM h WHERE NOT (src LIKE 'FY_ROLLOVER_%%' AND EXISTS(SELECT 1 FROM hist x WHERE x.buyer_id=h.buyer_id AND x.supplier_id=h.supplier_id))),
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
   UNION ALL SELECT buyer_id,supplier_id,coalesce(nullif(to_jsonb(t)->>'invoice_bill_date',''),to_jsonb(t)->>'invoice_date'), 'sale_invoices',round(coalesce((to_jsonb(t)->>'total_amount')::numeric,0)*100),0,'invoice' FROM %1$I.sale_invoices t
   UNION ALL SELECT buyer_id,supplier_id,receipt_date::text,'payments',0,round(coalesce((to_jsonb(t)->>'amount')::numeric,0)*100),'payment' FROM %1$I.payments t
  ),firsts AS (SELECT buyer_id,supplier_id,min(d) d FROM transactions WHERE src NOT LIKE 'FY_ROLLOVER_%%' GROUP BY buyer_id,supplier_id),
  effective AS (SELECT t.* FROM transactions t LEFT JOIN firsts f ON f.buyer_id=t.buyer_id AND f.supplier_id=t.supplier_id WHERE t.d<=$2 AND NOT ((t.src LIKE 'FY_ROLLOVER_%%' OR (t.kind='opening' AND t.src='HISTORICAL_IMPORT_2025_26')) AND f.d<left(t.d,4)||'-04-01')),
  totals AS (SELECT supplier_id,
   sum(CASE WHEN d<$1 OR kind='opening' THEN dr-cr ELSE 0 END) opening,
   sum(CASE WHEN d BETWEEN $1 AND $2 AND kind IN ('sale','invoice') THEN dr ELSE 0 END) sale,
   sum(CASE WHEN d BETWEEN $1 AND $2 AND kind IN ('receipt','payment') THEN cr-dr ELSE 0 END) receiving
   FROM effective GROUP BY supplier_id)
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',coalesce(to_jsonb(s)->>'company_name',to_jsonb(s)->>'name'),'city',to_jsonb(s)->>'city') ORDER BY coalesce(to_jsonb(s)->>'company_name',to_jsonb(s)->>'name')),'[]')
  FROM %1$I.suppliers s JOIN totals t ON t.supplier_id=s.id
  WHERE (abs(t.opening)>0.5 OR abs(t.sale)>0.5 OR abs(t.receiving)>0.5)
   AND NOT EXISTS(SELECT 1 FROM %1$I.supplier_commissions c WHERE c.supplier_id=s.id AND (c.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $3 AND $4)
  $report$,sch) INTO arr USING from_day::text,to_day::text,(p_args->>'bill_from')::date,(p_args->>'bill_to')::date;
  result:=jsonb_build_object('rows',arr);
 ELSIF p_action='pending_catalog' THEN
  EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''id'',id,''name'',coalesce(to_jsonb(t)->>''company_name'',to_jsonb(t)->>''name''),''city'',to_jsonb(t)->>''city'')),''[]'') FROM %I.suppliers t',sch) INTO arr;
  result:=jsonb_build_object('suppliers',arr);
  EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''supplier_id'',supplier_id,''created_at'',created_at)),''[]'') FROM %I.supplier_commissions',sch) INTO arr;
  result:=result||jsonb_build_object('supplier_commissions',arr);
 ELSIF p_action='pending_page' THEN
  tbl:=p_args->>'table';IF tbl NOT IN ('ledger_entries','sale_invoices','payments') THEN RAISE EXCEPTION 'Invalid financial source';END IF;
  cond:=CASE tbl WHEN 'ledger_entries' THEN 'ledger_date' WHEN 'sale_invoices' THEN 'invoice_bill_date' ELSE 'receipt_date' END;
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),''[]'') FROM (SELECT t.* FROM %I.%I t WHERE ($1::uuid IS NULL OR t.id>$1::uuid) AND left(coalesce(to_jsonb(t)->> %L,''''),10)<=$2 ORDER BY t.id LIMIT 500) x',sch,tbl,cond) INTO ids USING nullif(p_args->>'cursor',''),to_day::text;
  result:=jsonb_build_object('rows',ids,'has_more',jsonb_array_length(ids)=500,'next',ids->-1->>'id');
  IF tbl='ledger_entries' THEN
   EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t)),''[]'') FROM %I.ledger_entry_lines t JOIN jsonb_array_elements($1) h ON t.ledger_entry_id=(h->>''id'')::uuid',sch) INTO arr USING ids;
   result:=result||jsonb_build_object('ledger_entry_lines',arr);
  END IF;
 ELSIF p_action='crm_catalog' THEN
  FOREACH tbl IN ARRAY ARRAY['buyers','suppliers'] LOOP
   EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''id'',id,''name'',coalesce(to_jsonb(t)->>''company_name'',to_jsonb(t)->>''name''),''city'',to_jsonb(t)->>''city'',''crm_category'',to_jsonb(t)->>''crm_category'',''city_outer'',to_jsonb(t)->>''city_outer'')),''[]'') FROM %I.%I t',sch,tbl) INTO arr;
   result:=result||jsonb_build_object(tbl,arr);
  END LOOP;
  arr:=coalesce(authz->'employees','[]');
  IF to_regclass('public.team_members') IS NOT NULL THEN
   SELECT arr||coalesce(jsonb_agg(jsonb_build_object('id',id,'name',to_jsonb(t)->>'name','designation',to_jsonb(t)->>'designation')),'[]') INTO arr FROM public.team_members t;
  END IF;
  result:=result||jsonb_build_object('employees',arr);
 ELSIF p_action='crm_page' THEN
  tbl:=p_args->>'table';
  IF tbl NOT IN ('crm_followups','crm_outstanding_line_updates','crm_buyer_outstanding_tasks','crm_supplier_outstanding_tasks','order_followups','crm_order_line_updates','supplier_commission_comments','buyer_commission_comments') THEN RAISE EXCEPTION 'Invalid shared follow-up source';END IF;
  -- Outstanding roles can read only shared outstanding follow-ups. Private CRM notes are never exposed.
  IF sec='outstanding' AND tbl NOT IN ('crm_followups','crm_outstanding_line_updates','crm_buyer_outstanding_tasks','crm_supplier_outstanding_tasks') THEN arr:='[]';
  ELSIF to_regclass(format('%I.%I',sch,tbl)) IS NULL THEN arr:='[]';
  ELSE
   cond:=CASE WHEN tbl LIKE '%order%' THEN 'order' WHEN tbl LIKE '%commission%' THEN 'commission' ELSE 'outstanding' END;
   EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object(''_topic'',%L,''_source'',%L)),''[]'') FROM (SELECT t.* FROM %I.%I t WHERE left(coalesce(to_jsonb(t)->>''followup_date'',to_jsonb(t)->>''created_at'',''''),10) BETWEEN $1 AND $2 AND ($4 IS NULL OR coalesce(to_jsonb(t)->>''buyer_id'','''') IN (SELECT jsonb_array_elements_text($4))) ORDER BY id LIMIT 50 OFFSET $3) x',cond,tbl,sch,tbl) INTO arr USING from_day::text,to_day::text,greatest(0,coalesce((p_args->>'offset')::integer,0)),p_args->'buyer_ids';
   -- Resolve indexed parent IDs for rows which save only an order/bill reference.
   IF tbl LIKE '%order%' AND to_regclass(format('%I.orders',sch)) IS NOT NULL THEN
    EXECUTE format('SELECT coalesce(jsonb_agg(v||jsonb_strip_nulls(jsonb_build_object(''buyer_id'',coalesce(v->>''buyer_id'',o.buyer_id::text),''supplier_id'',coalesce(v->>''supplier_id'',o.supplier_id::text)))),''[]'') FROM jsonb_array_elements($1) v LEFT JOIN %I.orders o ON o.id=nullif(v->>''order_id'','''')::uuid',sch) INTO arr USING arr;
   ELSIF tbl LIKE '%commission_comments' THEN
    kind:=split_part(tbl,'_',1);
    EXECUTE format('SELECT coalesce(jsonb_agg(v||jsonb_strip_nulls(jsonb_build_object(%L,coalesce(v->>%L,to_jsonb(c)->>%L)))),''[]'') FROM jsonb_array_elements($1) v LEFT JOIN %I.%I c ON c.id=nullif(coalesce(v->>''commission_id'',v->>''bill_id''),'''')::uuid',kind||'_id',kind||'_id',kind||'_id',sch,kind||'_commissions') INTO arr USING arr;
   END IF;
  END IF;
  result:=jsonb_build_object('rows',arr,'has_more',jsonb_array_length(arr)=50);
 ELSIF p_action='parties' THEN
  FOREACH tbl IN ARRAY ARRAY['buyers','suppliers'] LOOP
   EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''id'',j->>''id'',''name'',coalesce(j->>''company_name'',j->>''name''),''city'',j->>''city'',''mobile'',coalesce(j->>''mobile'',j->>''contact_no'')) ORDER BY coalesce(j->>''company_name'',j->>''name'')),''[]'') FROM (SELECT to_jsonb(t) j FROM %I.%I t) x',sch,tbl) INTO arr;
   result:=result||jsonb_build_object(tbl,arr);
  END LOOP;
 ELSIF p_action IN ('finance','pending_bills') THEN
  IF p_action='finance' AND b='' AND s='' THEN RAISE EXCEPTION 'Choose a buyer or supplier'; END IF;
  FOREACH tbl IN ARRAY ARRAY['ledger_entries','sale_invoices','payments'] LOOP
   cond:='';IF b<>'' THEN cond:=cond||' AND j->>''buyer_id''=$1'; END IF;IF s<>'' THEN cond:=cond||' AND j->>''supplier_id''=$2'; END IF;
   cond:=cond||CASE tbl WHEN 'ledger_entries' THEN ' AND left(coalesce(j->>''ledger_date'',''''),10)<=$3' WHEN 'sale_invoices' THEN ' AND left(coalesce(j->>''invoice_bill_date'',j->>''invoice_date'',''''),10)<=$3' ELSE ' AND left(coalesce(j->>''receipt_date'',''''),10)<=$3' END;
   EXECUTE format('SELECT coalesce(jsonb_agg(j ORDER BY j->>''id''),''[]'') FROM (SELECT to_jsonb(t) j FROM %I.%I t) x WHERE true %s',sch,tbl,cond) INTO arr USING b,s,to_day::text;
   result:=result||jsonb_build_object(tbl,arr);
  END LOOP;
  ids:=coalesce(result->'ledger_entries','[]');
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t)),''[]'') FROM %I.ledger_entry_lines t WHERE to_jsonb(t)->>''ledger_entry_id'' IN (SELECT v->>''id'' FROM jsonb_array_elements($1) v)',sch) INTO arr USING ids;
  result:=result||jsonb_build_object('ledger_entry_lines',arr);
  IF p_action='pending_bills' THEN
   FOREACH tbl IN ARRAY ARRAY['supplier_commissions','buyers','suppliers'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t)),''[]'') FROM %I.%I t',sch,tbl) INTO arr;
    result:=result||jsonb_build_object(tbl,arr);
   END LOOP;
  END IF;
 ELSIF p_action='commission' THEN
  kind:=coalesce(p_args->>'kind','supplier');IF kind NOT IN ('supplier','buyer') THEN RAISE EXCEPTION 'Invalid commission kind';END IF;
  -- Raw records are restricted to bill IDs already returned by the existing authorized CEO endpoint.
  ids:=coalesce(p_args->'bill_ids','[]');IF jsonb_typeof(ids)<>'array' OR jsonb_array_length(ids)>500 THEN RAISE EXCEPTION 'Choose at most 500 bills per request';END IF;
  bill_allowed:='[]';pos:=0;
  LOOP
   EXECUTE format('SELECT %I.erp502_ceo($1,''commission'',$2)',sch) INTO bill_page USING p_token,p_args||jsonb_build_object('kind',kind,'offset',pos,'section','commission');
   IF bill_page->>'actor' IS DISTINCT FROM authz->>'actor' THEN RAISE EXCEPTION 'Commission authorization changed';END IF;
   SELECT bill_allowed||coalesce(jsonb_agg(v->>'id'),'[]') INTO bill_allowed FROM jsonb_array_elements(coalesce(bill_page->'rows','[]')) v;
   EXIT WHEN coalesce((bill_page->>'has_more')::boolean,jsonb_array_length(coalesce(bill_page->'rows','[]'))=30)=false OR jsonb_array_length(coalesce(bill_page->'rows','[]'))=0;
   pos:=pos+jsonb_array_length(bill_page->'rows');IF pos>300000 THEN RAISE EXCEPTION 'Commission report exceeds supported range';END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(ids) v WHERE NOT bill_allowed ? v) THEN RAISE EXCEPTION 'Commission bill not visible in this authorized report';END IF;
  FOREACH tbl IN ARRAY ARRAY[kind||'_commissions',kind||'_commission_comments',kind||'_commission_lines'] LOOP
   IF to_regclass(format('%I.%I',sch,tbl)) IS NULL THEN arr:='[]';
   ELSE
    cond:=CASE WHEN tbl=kind||'_commissions' THEN 'j->>''id''' ELSE 'coalesce(j->>''commission_id'',j->>''bill_id'')' END;
    EXECUTE format('SELECT coalesce(jsonb_agg(j),''[]'') FROM (SELECT to_jsonb(t) j FROM %I.%I t) x WHERE %s IN (SELECT jsonb_array_elements_text($1))',sch,tbl,cond) INTO arr USING ids;
   END IF;
   result:=result||jsonb_build_object(tbl,arr);
  END LOOP;
  -- All supplier/buyer masters are necessary to identify unbilled parties (desktop pending-bill rule).
  FOREACH tbl IN ARRAY ARRAY['buyers','suppliers'] LOOP
   EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''id'',j->>''id'',''name'',coalesce(j->>''company_name'',j->>''name''),''city'',j->>''city'')),''[]'') FROM (SELECT to_jsonb(t) j FROM %I.%I t) x',sch,tbl) INTO arr;
   result:=result||jsonb_build_object(tbl,arr);
  END LOOP;
 ELSIF p_action='tasks' THEN
  FOREACH tbl IN ARRAY ARRAY['erp377_tasks','erp426_work','erp377_task_members'] LOOP
   IF to_regclass(format('public.%I',tbl)) IS NULL THEN RAISE EXCEPTION 'Existing task table % unavailable',tbl;END IF;
   EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t)),''[]'') FROM public.%I t',tbl) INTO arr;
   result:=result||jsonb_build_object(tbl,arr);
  END LOOP;
  result:=result||jsonb_build_object('employees',coalesce(authz->'employees','[]'));
 END IF;
 RETURN jsonb_build_object('build',630,'actor',authz->>'actor','segment',seg,'data',result);
END $$;
REVOKE ALL ON FUNCTION public.mma630_owner_data(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mma630_owner_data(text,text,jsonb) TO anon,authenticated;
-- Enable the requested Assign Task create action only for Owner/Admin/CEO roles
-- which already have Helper Work Show. No other role or action is changed.
DO $roles$
BEGIN
 IF to_regclass('public.team_roles') IS NOT NULL THEN
  CREATE TABLE IF NOT EXISTS public.mma632_task_role_backup(role_id uuid PRIMARY KEY,permissions jsonb,recorded_at timestamptz DEFAULT now());
  REVOKE ALL ON public.mma632_task_role_backup FROM PUBLIC,anon,authenticated;
  INSERT INTO public.mma632_task_role_backup(role_id,permissions)
   SELECT id,permissions FROM public.team_roles
   WHERE role_name ~* '\m(ceo|owner|admin|administrator)\M' AND permissions#>>'{_pages,helperWork,show}'='true'
   ON CONFLICT(role_id) DO NOTHING;
  UPDATE public.team_roles SET permissions=jsonb_set(permissions,'{_pages}',coalesce(permissions->'_pages','{}')||jsonb_build_object('helperWork',coalesce(permissions#>'{_pages,helperWork}','{}')||'{"save":true}'::jsonb))
   WHERE role_name ~* '\m(ceo|owner|admin|administrator)\M' AND permissions#>>'{_pages,helperWork,show}'='true';
 END IF;
END $roles$;

NOTIFY pgrst,'reload schema';
COMMIT;
SELECT 'V632 Owner task assignment and compact reports installed' status;
