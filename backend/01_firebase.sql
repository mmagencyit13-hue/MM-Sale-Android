-- V613: independent native queue; existing browser push queues remain unchanged.
-- Run once in Supabase SQL Editor as postgres. No Firebase private key belongs here.
begin;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.mma613_devices (
 device_id uuid primary key, recipient_id uuid not null, fcm_token text not null unique,
 updated_at timestamptz not null default now(), enabled boolean not null default true,
 last_test_at timestamptz
);
create table if not exists public.mma613_jobs (
 id bigint generated always as identity primary key, device_id uuid not null references public.mma613_devices on delete cascade,
 recipient_id uuid not null, source text not null check(source in ('chat','task','test')), source_id bigint not null,
 data jsonb not null, created_at timestamptz not null default now(), expires_at timestamptz not null,
 attempts integer not null default 0, next_attempt timestamptz not null default now(),
 lease uuid, lease_until timestamptz, delivered_at timestamptz, error text,
 unique(device_id,source,source_id)
);
create index if not exists mma613_pending on public.mma613_jobs(next_attempt) where delivered_at is null;
create table if not exists public.mma613_settings (
 id boolean primary key default true check(id), worker_key text not null,
 endpoint text not null default 'https://vuogorddmdumjpquvuqz.supabase.co/functions/v1/mma-firebase-push'
);
insert into public.mma613_settings(id,worker_key) values(true,replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','')) on conflict do nothing;
alter table public.mma613_devices enable row level security;
alter table public.mma613_jobs enable row level security;
alter table public.mma613_settings enable row level security;
revoke all on public.mma613_devices,public.mma613_jobs,public.mma613_settings from public,anon,authenticated;

create or replace function public.mma613_register(p_session text,p_device uuid,p_fcm text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor jsonb; uid uuid;
begin
 actor:=public.erp_employee_session_v332(p_session); uid:=(actor->>'id')::uuid;
 if p_device is null or length(p_fcm)<30 or length(p_fcm)>4096 then raise exception 'Invalid device registration';end if;
 -- One device token cannot remain attached to another employee/device.
 delete from public.mma613_devices where fcm_token=p_fcm and device_id<>p_device;
 delete from public.mma613_jobs where device_id=p_device and recipient_id<>uid and delivered_at is null;
 insert into public.mma613_devices(device_id,recipient_id,fcm_token) values(p_device,uid,p_fcm)
 on conflict(device_id) do update set recipient_id=excluded.recipient_id,fcm_token=excluded.fcm_token,updated_at=now(),enabled=true;
 return jsonb_build_object('ok',true,'recipient_id',uid);
end $$;

create or replace function public.mma613_worker_authorize(p_key text)
returns boolean language sql security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.mma613_settings where worker_key=p_key and length(p_key)=64)
$$;
create or replace function public.mma613_kick()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.mma613_settings;
begin
 select * into s from public.mma613_settings where id;
 perform net.http_post(url:=s.endpoint,headers:=jsonb_build_object('Content-Type','application/json','x-mma-worker',s.worker_key),body:='{"op":"work"}'::jsonb,timeout_milliseconds:=10000);
end $$;

create or replace function public.mma613_enqueue()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid; payload jsonb; deadline timestamptz; ev record; task record;
begin
 if TG_TABLE_NAME='erp423_chat_push' then
  uid:=NEW.recipient_id;deadline:=NEW.expires_at;
  payload:=jsonb_build_object('type','chat','kind',NEW.kind,'room_id',NEW.room_id,'message_id',NEW.message_id,'recipient_id',uid);
  insert into public.mma613_jobs(device_id,recipient_id,source,source_id,data,expires_at)
  select device_id,uid,'chat',NEW.id,payload,least(deadline,now()+interval '1 day') from public.mma613_devices
  where recipient_id=uid and enabled and updated_at>now()-interval '90 days' on conflict do nothing;
 else
  uid:=NEW.member_id;
  select * into ev from public.erp377_task_events where id=NEW.event_id;
  select * into task from public.erp377_tasks where id=ev.task_id;
  payload:=jsonb_build_object('type','task','task_id',ev.task_id,'kind',ev.kind,'recipient_id',uid);
  insert into public.mma613_jobs(device_id,recipient_id,source,source_id,data,expires_at)
  select device_id,uid,'task',NEW.id,payload,least(task.expires_at,now()+interval '1 day') from public.mma613_devices
  where recipient_id=uid and enabled and updated_at>now()-interval '90 days' on conflict do nothing;
 end if;
 if found then
  begin perform public.mma613_kick();exception when others then raise warning 'V613 push wake deferred to cron';end;
 end if;
 return NEW;
exception when others then
 -- Push failure must not prevent saving a chat message or task.
 raise warning 'V613 native notification enqueue failed: %',SQLSTATE;
 return NEW;
end $$;
drop trigger if exists mma613_chat on public.erp423_chat_push;
create trigger mma613_chat after insert on public.erp423_chat_push for each row execute function public.mma613_enqueue();
drop trigger if exists mma613_task on public.erp377_task_push;
create trigger mma613_task after insert on public.erp377_task_push for each row execute function public.mma613_enqueue();

create or replace function public.mma613_claim()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 -- Existing task tick generates established schedule events; reminders retain their 09:00 IST rule.
 perform public.erp377_tick();
 perform public.erp426_reminders();
 delete from public.mma613_jobs where created_at<now()-interval '7 days';
 update public.mma613_jobs j set delivered_at=now(),error='Expired or no longer relevant'
 where delivered_at is null and (
 expires_at<=now() or not exists(select 1 from public.mma613_devices d where d.device_id=j.device_id and d.recipient_id=j.recipient_id and d.enabled and d.updated_at>now()-interval '90 days')
 or not public.erp333_active(j.recipient_id)
 or (source='chat' and not exists(
  select 1 from public.erp423_chat_push p where p.id=j.source_id and public.erp333_active(p.recipient_id)
  and not exists(select 1 from public.erp338_chat_preferences c where c.user_id=p.recipient_id and c.kind=p.kind and c.room_id=p.room_id and c.muted)
  and ((p.kind='direct' and exists(select 1 from public.erp332_chat_messages m where m.id=p.message_id and m.recipient_id=p.recipient_id and m.sender_id=p.room_id and m.read_at is null and m.body<>'This message was deleted'))
    or (p.kind='group' and exists(select 1 from public.erp333_messages m join public.erp333_members g on g.group_id=m.group_id and g.user_id=p.recipient_id where m.id=p.message_id and m.group_id=p.room_id and g.last_read<m.id and m.body<>'This message was deleted')))))
 or (source='task' and not exists(
  select 1 from public.erp377_task_push p join public.erp377_task_events e on e.id=p.event_id
  join public.erp377_tasks t on t.id=e.task_id join public.erp377_task_members m on m.task_id=t.id and m.member_id=p.member_id
  where p.id=j.source_id and t.expires_at>now() and t.status<>'Cancelled'
  and (e.kind<>'URGENT' or t.status='Pending')
  and (e.kind<>'WORK_REMINDER' or not exists(select 1 from public.erp426_work w where w.task_id=t.id and w.work_status in('Completed','Cancelled')))
  and (e.kind<>'CREATED' or not exists(select 1 from public.erp454_task_opens o where o.task_id=t.id and o.employee_id=p.member_id)))));
 with chosen as (
  select id from public.mma613_jobs where delivered_at is null and attempts<8 and next_attempt<=now()
  and coalesce(lease_until,'-infinity'::timestamptz)<now() order by id limit 30 for update skip locked
 ), leased as (
  update public.mma613_jobs j set lease=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=attempts+1
  from chosen c where c.id=j.id returning j.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'lease',j.lease,'device_id',j.device_id,'recipient_id',j.recipient_id,
  'data',j.data,'expires_at',j.expires_at,'token',d.fcm_token)),'[]'::jsonb) into result
 from leased j join public.mma613_devices d on d.device_id=j.device_id and d.recipient_id=j.recipient_id;
 return result;
end $$;
create or replace function public.mma613_finish(p_id bigint,p_lease uuid,p_ok boolean,p_dead boolean default false,p_error text default '',p_token text default '')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_dead then
  update public.mma613_devices d set enabled=false from public.mma613_jobs j
  where j.id=p_id and j.lease=p_lease and d.device_id=j.device_id and d.recipient_id=j.recipient_id and d.fcm_token=p_token;
 end if;
 update public.mma613_jobs set delivered_at=case when p_ok or p_dead then now() else null end,
 error=left(p_error,150),lease_until=null,next_attempt=now()+least(10,attempts)*interval '1 minute'
 where id=p_id and lease=p_lease;
end $$;
create or replace function public.mma613_test(p_session text,p_device uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor jsonb; uid uuid; job bigint;
begin
 actor:=public.erp_employee_session_v332(p_session);uid:=(actor->>'id')::uuid;
 update public.mma613_devices set last_test_at=now() where device_id=p_device and recipient_id=uid and enabled
 and (last_test_at is null or last_test_at<now()-interval '30 seconds');
 if not found then raise exception 'Enable notifications first, or wait 30 seconds between tests';end if;
 insert into public.mma613_jobs(device_id,recipient_id,source,source_id,data,expires_at)
 values(p_device,uid,'test',floor(extract(epoch from clock_timestamp())*1000000)::bigint,
 jsonb_build_object('type','test','recipient_id',uid),now()+interval '10 minutes') returning id into job;
 perform public.mma613_kick();
 return jsonb_build_object('ok',true,'job_id',job);
end $$;
create or replace function public.mma613_job_valid(p_id bigint,p_lease uuid,p_token text)
returns boolean language sql security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.mma613_jobs j join public.mma613_devices d on d.device_id=j.device_id
 where j.id=p_id and j.lease=p_lease and j.delivered_at is null and j.expires_at>now()
 and d.enabled and d.recipient_id=j.recipient_id and d.fcm_token=p_token and public.erp333_active(j.recipient_id))
$$;
create or replace function public.mma613_status(p_session text,p_device uuid,p_job bigint)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor jsonb; result jsonb;
begin
 actor:=public.erp_employee_session_v332(p_session);
 select jsonb_build_object('accepted',delivered_at is not null and coalesce(error,'')='','attempts',attempts,'error',error)
 into result from public.mma613_jobs where id=p_job and device_id=p_device and recipient_id=(actor->>'id')::uuid and source='test';
 return coalesce(result,'{}'::jsonb);
end $$;
-- Never expose a SECURITY DEFINER RPC to anon/authenticated.
do $$ declare f record;begin
 for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'mma613_%' loop
 execute format('revoke all on function %s from public, anon, authenticated',f.sig);
 execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end $$;
select cron.schedule('mma613-firebase-minute','* * * * *','select public.mma613_kick();');
commit;
select 'V613 installed' as status;
