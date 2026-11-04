-- Return an explicit cooldown instead of a generic server exception.
begin;
create or replace function public.mma613_test(p_session text,p_device uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor jsonb;uid uuid;job bigint;last_test timestamptz;retry integer;
begin
 actor:=public.erp_employee_session_v332(p_session);uid:=(actor->>'id')::uuid;
 if uid is null then raise exception 'Login required';end if;
 select last_test_at into last_test from public.mma613_devices
 where device_id=p_device and recipient_id=uid and enabled for update;
 if not found then return jsonb_build_object('ok',false,'code','REGISTER_REQUIRED','message','Enable Notifications again to connect this phone.');end if;
 retry:=greatest(0,ceil(extract(epoch from last_test+interval '30 seconds'-clock_timestamp()))::integer);
 if last_test is not null and retry>0 then
  return jsonb_build_object('ok',false,'code','TEST_COOLDOWN','retry_after',retry,'message','Wait '||retry||' seconds before the next test.');
 end if;
 update public.mma613_devices set last_test_at=clock_timestamp() where device_id=p_device and recipient_id=uid and enabled;
 insert into public.mma613_jobs(device_id,recipient_id,source,source_id,data,expires_at)
 values(p_device,uid,'test',floor(extract(epoch from clock_timestamp())*1000000)::bigint,
 jsonb_build_object('type','test','recipient_id',uid),now()+interval '10 minutes') returning id into job;
 perform public.mma613_kick();
 return jsonb_build_object('ok',true,'job_id',job);
end $$;
-- Keep the existing service-only RPC boundary.
revoke all on function public.mma613_test(text,uuid) from public,anon,authenticated;
grant execute on function public.mma613_test(text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
