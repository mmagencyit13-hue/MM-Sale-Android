-- Read-only checks for MM Buddy production scheduling and authentication contracts.
-- Outputs function definitions for the listed RPCs. Share only with the maintainer.
select jobname, schedule, active
from cron.job
where jobname ~* '(buddy|539|firebase|morning)'
order by jobname;

select j.jobname, d.status, d.start_time, d.end_time
from cron.job_run_details d
join cron.job j on j.jobid=d.jobid
where j.jobname ~* '(buddy|539|firebase|morning)'
order by d.start_time desc limit 25;

select report_type, report_date, count(*) as recipients
from public.erp539_buddy_push
where report_date >= (now() at time zone 'Asia/Kolkata')::date - 3
group by report_type, report_date
order by report_date desc, report_type;

select data->>'report_type' as report_type,
       data->>'report_date' as report_date,
       count(*) as queued,
       count(*) filter (where delivered_at is not null and coalesce(error,'')='') as accepted,
       count(*) filter (where delivered_at is null) as pending
from public.mma613_jobs
where source='buddy' and created_at >= now()-interval '3 days'
group by 1,2 order by 2 desc,1;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f'
and p.proname in ('erp473_app_login','erp_employee_session_v332','erp_employee_password_reset')
order by p.proname;
