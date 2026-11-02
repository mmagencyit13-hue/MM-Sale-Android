-- V629: mirror existing MM Buddy report events into the independent Android queue.
-- Run in Supabase SQL Editor as postgres. No private keys are used here.
-- Existing morning report generation, browser delivery and report access rules are retained.
begin;
do $$
declare field text;
begin
 if to_regclass('public.erp539_buddy_push') is null or to_regclass('public.mma613_jobs') is null then
  raise exception 'Existing Buddy / Firebase queues are missing. Migration rolled back.';
 end if;
 foreach field in array array['recipient_id','report_type','report_date','expires_at'] loop
  if not exists(select 1 from pg_attribute where attrelid='public.erp539_buddy_push'::regclass and attname=field and not attisdropped) then
   raise exception 'Buddy queue field % does not match this installation. Migration rolled back; send the queue schema for adjustment.',field;
  end if;
 end loop;
end $$;
create table if not exists public.mma629_buddy_events (
 id bigint generated always as identity primary key,
 recipient_id uuid not null, report_type text not null check(report_type in ('orders','visitors')),
 report_date date not null, expires_at timestamptz not null,
 unique(recipient_id,report_type,report_date)
);
alter table public.mma629_buddy_events enable row level security;
revoke all on public.mma629_buddy_events from public,anon,authenticated;
-- Exact original source constraint from the installed V613 schema, extended additively.
alter table public.mma613_jobs drop constraint if exists mma613_jobs_source_check;
alter table public.mma613_jobs add constraint mma613_jobs_source_check check(source in ('chat','task','test','buddy'));

create or replace function public.mma629_buddy_event(p_event jsonb)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid; typ text; report_day date; deadline timestamptz; event_key bigint; count_new integer;
begin
 uid:=nullif(p_event->>'recipient_id','')::uuid;
 typ:=p_event->>'report_type';
 report_day:=nullif(p_event->>'report_date','')::date;
 deadline:=nullif(p_event->>'expires_at','')::timestamptz;
 if uid is null or typ not in ('orders','visitors') or typ is null or report_day is null or deadline is null or deadline<=now() then return 0; end if;
 if not public.erp333_active(uid) then return 0; end if;
 -- Do not turn old browser report history into a flood of Android alerts.
 if (typ='visitors' and report_day<>(now() at time zone 'Asia/Kolkata')::date) or (typ='orders' and report_day not between (now() at time zone 'Asia/Kolkata')::date-1 and (now() at time zone 'Asia/Kolkata')::date) then return 0; end if;
 insert into public.mma629_buddy_events(recipient_id,report_type,report_date,expires_at)
 values(uid,typ,report_day,least(deadline,now()+interval '1 day'))
 on conflict(recipient_id,report_type,report_date) do update set expires_at=excluded.expires_at
 returning id into event_key;
 insert into public.mma613_jobs(device_id,recipient_id,source,source_id,data,expires_at)
 select device_id,uid,'buddy',event_key,jsonb_build_object('type','buddy','recipient_id',uid,'report_type',typ,'report_date',report_day),least(deadline,now()+interval '1 day')
 from public.mma613_devices where recipient_id=uid and enabled and updated_at>now()-interval '90 days'
 on conflict(device_id,source,source_id) do nothing;
 get diagnostics count_new=row_count;
 return count_new;
end $$;

create or replace function public.mma629_buddy_trigger()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.mma629_buddy_event(to_jsonb(NEW))>0 then
  begin perform public.mma613_kick(); exception when others then raise warning 'Buddy Android wake deferred to existing Firebase cron'; end;
 end if;
 return NEW;
exception when others then
 raise warning 'Buddy Android enqueue failed (SQLSTATE %); existing browser report remains saved',SQLSTATE;
 return NEW;
end $$;
drop trigger if exists mma629_buddy_android on public.erp539_buddy_push;
create trigger mma629_buddy_android after insert or update on public.erp539_buddy_push for each row execute function public.mma629_buddy_trigger();

create or replace function public.mma629_buddy_sync()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare item record; total integer:=0;
begin
 -- Reuses already-generated report events, independently of browser leases/delivery state.
 -- This also picks up a device enabled after the morning report was generated.
 for item in select to_jsonb(p) as payload from public.erp539_buddy_push p
 where p.expires_at>now() and p.report_date>=(now() at time zone 'Asia/Kolkata')::date-1 loop
  total:=total+public.mma629_buddy_event(item.payload);
 end loop;
 return total;
end $$;
revoke all on function public.mma629_buddy_event(jsonb),public.mma629_buddy_trigger(),public.mma629_buddy_sync() from public,anon,authenticated;
grant execute on function public.mma629_buddy_event(jsonb),public.mma629_buddy_trigger(),public.mma629_buddy_sync() to service_role;
select public.mma629_buddy_sync() as android_reports_queued;
commit;
select 'V629 Buddy Android bridge installed' as status;
