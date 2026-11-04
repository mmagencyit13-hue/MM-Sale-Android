-- Service-only targeted lease for an authenticated device's own test job.
begin;
create or replace function public.mma648_claim_test(p_session text,p_device uuid,p_job bigint)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor jsonb;uid uuid;result jsonb;
begin
 actor:=public.erp_employee_session_v332(p_session);uid:=(actor->>'id')::uuid;
 if uid is null then raise exception 'Login required';end if;
 with chosen as (
  select j.id from public.mma613_jobs j join public.mma613_devices d on d.device_id=j.device_id and d.recipient_id=j.recipient_id
  where j.id=p_job and j.source='test' and j.device_id=p_device and j.recipient_id=uid and d.enabled
   and j.delivered_at is null and j.expires_at>now() and j.attempts<8
   and coalesce(j.lease_until,'-infinity'::timestamptz)<now()
  for update of j skip locked
 ),leased as (
  update public.mma613_jobs j set lease=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=attempts+1
  from chosen c where c.id=j.id returning j.*
 ) select jsonb_build_object('id',j.id,'lease',j.lease,'token',d.fcm_token,'data',j.data,'expires_at',j.expires_at)
 into result from leased j join public.mma613_devices d on d.device_id=j.device_id and d.recipient_id=j.recipient_id;
 return result;
end $$;
revoke all on function public.mma648_claim_test(text,uuid,bigint) from public,anon,authenticated;
grant execute on function public.mma648_claim_test(text,uuid,bigint) to service_role;
notify pgrst,'reload schema';
commit;
