-- Read only. No tokens, worker key, private keys or session credentials are returned.
select (select count(*) from public.mma613_devices where enabled) as enabled_devices,
 (select count(*) from public.mma613_jobs where delivered_at is null and attempts<8 and expires_at>now()) as pending_jobs,
 (select count(*) from public.mma613_jobs where delivered_at is not null and coalesce(error,'')='') as firebase_accepted,
 (select count(*) from public.mma613_jobs where attempts>=8 and delivered_at is null) as exhausted_jobs;
select id,source,created_at,attempts,delivered_at,error from public.mma613_jobs order by id desc limit 15;
select jobname,schedule,active from cron.job where jobname='mma613-firebase-minute';
