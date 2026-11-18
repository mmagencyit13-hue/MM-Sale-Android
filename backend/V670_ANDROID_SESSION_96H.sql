-- Run after V667 Change Password is installed. This adds Android-specific RPCs.
begin;

create table if not exists public.mma670_android_sessions (
  token_key text primary key,
  expires_at timestamptz not null
);
alter table public.mma670_android_sessions enable row level security;
revoke all on public.mma670_android_sessions from public, anon, authenticated;

create or replace function public.mma670_android_login(
  p_login text, p_password text, p_device text, p_takeover boolean default false
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  result jsonb;
  session_token text;
  deadline timestamptz;
begin
  -- Existing login enforces passwords, rate limits, active roles and device takeover.
  result := public.erp473_app_login(p_login,p_password,p_device,p_takeover);
  if result->>'ok' is distinct from 'true' then return result; end if;
  session_token := result->>'token';
  update public.erp332_sessions s
    set expires_at=now()+interval '96 hours'
    where s.token_hash=public.erp332_hash(session_token)
      and s.actor_kind='employee' and not s.revoked
    returning s.expires_at into strict deadline;
  delete from public.mma670_android_sessions a where a.expires_at<=now();
  insert into public.mma670_android_sessions(token_key,expires_at)
  values(public.erp332_hash(session_token)::text,deadline);
  return jsonb_set(result,'{employee,expires_at}',to_jsonb(deadline));
end $$;

create or replace function public.mma670_android_touch(p_token text)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  deadline timestamptz;
begin
  -- Keep all existing credential, account, role and revocation checks.
  if public.erp_employee_session_v332(p_token)->>'kind' is distinct from 'employee' then
    return jsonb_build_object('ok',false);
  end if;
  update public.erp332_sessions s
    set expires_at=greatest(s.expires_at,now()+interval '96 hours')
  where s.token_hash=public.erp332_hash(p_token)
    and not s.revoked and s.expires_at>now() and s.actor_kind='employee'
    and exists(select 1 from public.mma670_android_sessions a
               where a.token_key=s.token_hash::text and a.expires_at>now())
  returning s.expires_at into deadline;
  if deadline is null then return jsonb_build_object('ok',false); end if;
  update public.mma670_android_sessions a set expires_at=greatest(a.expires_at,deadline)
  where a.token_key=public.erp332_hash(p_token)::text;
  return jsonb_build_object('ok',true,'expires_at',deadline);
end $$;
revoke all on function public.mma670_android_login(text,text,text,boolean),public.mma670_android_touch(text) from public;
grant execute on function public.mma670_android_login(text,text,text,boolean),public.mma670_android_touch(text) to anon, authenticated;
commit;
