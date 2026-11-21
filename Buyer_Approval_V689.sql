begin;

create table if not exists public.mma689_buyer_requests (
  business text not null,
  buyer_id uuid not null,
  submitter uuid not null,
  revision text not null,
  primary key (business,buyer_id)
);
create table if not exists public.mma689_buyer_decisions (
  id bigint generated always as identity primary key,
  business text not null,
  buyer_id uuid not null,
  recipient uuid not null,
  revision text not null,
  buyer_name text not null,
  decision text not null,
  remark text not null,
  changes jsonb not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (business,buyer_id,revision)
);
create index if not exists mma689_buyer_decisions_recipient on public.mma689_buyer_decisions (recipient,business,id desc);
create table if not exists public.mma689_buyer_read (
  business text not null,
  actor uuid not null,
  buyer_id uuid not null,
  revision text not null,
  primary key (business,actor,buyer_id,revision)
);
alter table public.mma689_buyer_requests enable row level security;
alter table public.mma689_buyer_decisions enable row level security;
alter table public.mma689_buyer_read enable row level security;
revoke all on public.mma689_buyer_requests, public.mma689_buyer_decisions, public.mma689_buyer_read from public, anon, authenticated;

create or replace function public.mma689_buyer_approval(p_token text,p_action text,p_args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
<<flow>>
declare
  auth jsonb := public.erp_employee_session_v332(p_token);
  actor uuid;
  access_mode text;
  business text := coalesce(p_args->>'business','readymade');
  sch text;
  role_label text;
  permissions jsonb;
  admin boolean;
  reviewer boolean;
  buyer_id uuid;
  buyer jsonb;
  submitted public.mma689_buyer_requests%rowtype;
  rev text;
  patch jsonb := coalesce(p_args->'edits','{}');
  change_log jsonb := '{}';
  decision text := p_args->>'decision';
  remark text := trim(coalesce(p_args->>'remark',''));
  field text;
  value jsonb;
  pending jsonb := '[]';
  decisions jsonb := '[]';
  unread bigint := 0;
  decision_unread bigint := 0;
  reviewer_unread bigint := 0;
  related boolean;
begin
  if nullif(auth->>'id','') is null or coalesce(auth->>'kind','') not in ('employee','admin') then
    raise exception 'Sign in again to use buyer approvals';
  end if;
  actor := (auth->>'id')::uuid;
  admin := auth->>'kind'='admin';
  if not admin then
    select r.role_name,r.permissions into role_label,permissions
    from public.erp_employees e join public.team_roles r on r.id=e.role_id
    where e.id=actor;
    if role_label is null then raise exception 'Employee designation unavailable'; end if;
  end if;
  reviewer := admin or coalesce(role_label ~* '\m(ceo|owner)\M',false);
  access_mode := public.mma548_context(p_token)->>'access';
  if business not in ('readymade','grey') or coalesce(access_mode,'') not in ('readymade','grey','both') then
    raise exception 'Business access unavailable';
  end if;
  if access_mode='grey' then business := 'grey'; end if;
  if business='grey' and access_mode not in ('grey','both') then raise exception 'Grey business access denied'; end if;
  sch := case when business='grey' then 'mma_grey' else 'public' end;

  if p_action in ('inbox','mark-review-read','mark-decision-read') then
    if p_action='mark-review-read' then
      if not reviewer then raise exception 'CEO approval access required'; end if;
      execute format($q$
        insert into public.mma689_buyer_read (business,actor,buyer_id,revision)
        select $1,$2,b.id,b.approval_revision::text from %I.buyers b
        where b.approval_status='Pending' and coalesce(b.approval_ready,true)
          and b.approval_revision is not null
          and exists (select 1 from jsonb_array_elements($3) i
               where i->>'id'=b.id::text and i->>'revision'=b.approval_revision::text)
        on conflict do nothing$q$,sch) using business,actor,coalesce(p_args->'seen','[]'::jsonb);
    elsif p_action='mark-decision-read' then
      update public.mma689_buyer_decisions d set read_at=coalesce(d.read_at,now())
      where d.business=flow.business and d.recipient=actor and d.id=(p_args->>'notice')::bigint;
    end if;
    if reviewer then
      execute format($q$
        select coalesce(jsonb_agg(to_jsonb(q) - 'total'), '[]'),coalesce(max(total),0)
        from (select b.id,b.company_name,b.approval_revision::text as revision,b.approval_requested_at,
              count(*) over() total
              from %I.buyers b
              where b.approval_status='Pending' and coalesce(b.approval_ready,true)
              and b.approval_revision is not null
              and not exists (select 1 from public.mma689_buyer_read v where v.business=$1 and v.actor=$2
                   and v.buyer_id=b.id and v.revision=b.approval_revision::text)
              order by b.approval_requested_at desc,b.id limit 30) q$q$,sch)
        into pending,reviewer_unread using business,actor;
    end if;
    select coalesce(jsonb_agg(to_jsonb(d) order by d.id desc),'[]') into decisions
      from (select d.id,d.buyer_id,d.buyer_name,d.decision,d.remark,d.changes,d.read_at,d.created_at
            from public.mma689_buyer_decisions d
            where d.business=flow.business and d.recipient=actor
            order by d.read_at is not null,d.id desc limit 30) d;
    select count(*) into decision_unread from public.mma689_buyer_decisions d
    where d.business=flow.business and d.recipient=actor and d.read_at is null;
    return jsonb_build_object('actor',actor,'business',business,'review',pending,'decisions',decisions,
      'reviewUnread',reviewer_unread,'unread',reviewer_unread+decision_unread);
  end if;

  buyer_id := nullif(p_args->>'id','')::uuid;
  execute format('select to_jsonb(b) from %I.buyers b where id=$1 for update',sch) into buyer using buyer_id;
  if buyer is null then raise exception 'Buyer unavailable. Refresh the list.'; end if;
  select * into submitted from public.mma689_buyer_requests r
    where r.business=flow.business and r.buyer_id=flow.buyer_id;
  rev := buyer->>'approval_revision';

  if p_action='track' or p_action='resend' then
    if not admin and coalesce(permissions#>>'{_pages,buyerForm,update}',permissions#>>'{_pages,buyers,update}',permissions#>>'{Buyer,update}','false') <> 'true'
      and (p_action<>'track' or coalesce(permissions#>>'{_pages,buyerForm,save}',permissions#>>'{_pages,buyers,save}',permissions#>>'{Buyer,save}','false') <> 'true')
    then raise exception 'Buyer save or update permission required'; end if;
    if p_action='resend' then
      if buyer->>'approval_status'<>'Not Approved' or rev is distinct from p_args->>'revision' then
        raise exception 'Buyer approval changed. Refresh and reopen the buyer.';
      end if;
      execute format($q$update %I.buyers b set approval_status='Pending',approval_ready=true,
        approval_revision=coalesce(approval_revision,0)+1,approval_requested_at=now(),approved_at=null
        where id=$1 returning to_jsonb(b)$q$,sch) into buyer using buyer_id;
      rev := buyer->>'approval_revision';
    elsif buyer->>'approval_status'<>'Pending' then
      raise exception 'This buyer is no longer awaiting review';
    end if;
    insert into public.mma689_buyer_requests as requests (business,buyer_id,submitter,revision)
    values (business,buyer_id,coalesce(submitted.submitter,actor),rev)
    on conflict on constraint mma689_buyer_requests_pkey do update set revision=excluded.revision;
    return buyer||jsonb_build_object('actor',actor);
  end if;

  if p_action='delete-rejected' then
    if not admin and coalesce(permissions#>>'{_pages,buyers,delete}',permissions#>>'{Buyer,delete}','false') <> 'true' then
      raise exception 'Buyer delete permission required';
    end if;
    if buyer->>'approval_status'<>'Not Approved' or rev is distinct from p_args->>'revision' then
      raise exception 'Buyer approval changed. Refresh the buyer list.';
    end if;
    foreach field in array array['orders','order_forms','order_form_entries','sale_invoices','ledger_entries','payments','payment_entries',
      'opening_balances','buyer_opening_balances','credit_notes','supplier_commission_items','buyer_commissions','buyer_commission_items'] loop
      if exists(select 1 from information_schema.columns c where c.table_schema=sch and c.table_name=field and c.column_name='buyer_id') then
        execute format('select exists(select 1 from %I.%I where buyer_id::text=$1)',sch,field) into related using buyer_id::text;
        if related then raise exception 'Buyer has related transactions and cannot be deleted'; end if;
      end if;
    end loop;
    if to_regclass(format('%I.party_contacts',sch)) is not null then
      execute format('delete from %I.party_contacts where buyer_id=$1',sch) using buyer_id;
    end if;
    execute format('delete from %I.buyers where id=$1',sch) using buyer_id;
    delete from public.mma689_buyer_requests r where r.business=flow.business and r.buyer_id=flow.buyer_id;
    return jsonb_build_object('deleted',true,'id',buyer_id,'actor',actor);
  end if;

  if p_action<>'review' then raise exception 'Unknown buyer action'; end if;
  if not reviewer then raise exception 'CEO approval access required'; end if;
  if buyer->>'approval_status'<>'Pending' or buyer->>'approval_ready'='false' or rev is null
     or rev is distinct from p_args->>'revision' then
    raise exception 'Buyer was changed or reviewed. Refresh Buyer Approval.';
  end if;
  if decision is null or decision not in ('Approved','Not Approved') then raise exception 'Choose an approval result'; end if;
  if decision='Not Approved' and (remark='' or length(remark)>1000) then raise exception 'Enter a rejection remark (up to 1000 characters)'; end if;
  if decision='Approved' then
    for field,value in select * from jsonb_each(patch) loop
      if field not in ('company_name','item_required','credit_limit','reference_company') then raise exception 'Unrecognized buyer field'; end if;
      if field='credit_limit' then
        if jsonb_typeof(value) not in ('number','null') or (jsonb_typeof(value)='number' and (value::text::numeric<0 or value::text::numeric>999999999999)) then
          raise exception 'Enter a valid credit limit';
        end if;
      elsif jsonb_typeof(value) <> 'string' or length(value#>>'{}')>300 or
        (field='company_name' and trim(value#>>'{}')='') then raise exception 'Enter valid buyer details';
      end if;
      if coalesce(buyer->field,'null'::jsonb) is distinct from value then
        change_log := change_log || jsonb_build_object(field,jsonb_build_object('old',buyer->field,'new',value));
      end if;
    end loop;
  else
    patch := '{}';
  end if;

  execute format($q$
    update %I.buyers b set company_name=n.company_name,item_required=n.item_required,
      credit_limit=n.credit_limit,reference_company=n.reference_company,approval_status=n.approval_status,
      approved_at=case when $3='Approved' then now() else null end
    from jsonb_populate_record(null::%I.buyers,$2) n where b.id=$1$q$,sch,sch)
    using buyer_id,buyer||patch||jsonb_build_object('approval_status',decision),decision;

  if submitted.submitter is null then
    select e.id into submitted.submitter from public.erp_employees e
      where e.id::text=coalesce(buyer->>'approval_requested_by',buyer->>'approval_submitted_by',buyer->>'created_by');
  end if;
  if submitted.submitter is not null and (decision='Not Approved' or change_log<>'{}'::jsonb) then
    insert into public.mma689_buyer_decisions(business,buyer_id,recipient,revision,buyer_name,decision,remark,changes)
    values(business,buyer_id,submitted.submitter,rev,coalesce(patch->>'company_name',buyer->>'company_name','Buyer'),decision,remark,change_log);
  end if;
  return jsonb_build_object('actor',actor,'decision',decision,'changes',change_log,'notified',
    submitted.submitter is not null and (decision='Not Approved' or change_log<>'{}'::jsonb));
end;
$$;
revoke all on function public.mma689_buyer_approval(text,text,jsonb) from public;
grant execute on function public.mma689_buyer_approval(text,text,jsonb) to anon, authenticated;
commit;
