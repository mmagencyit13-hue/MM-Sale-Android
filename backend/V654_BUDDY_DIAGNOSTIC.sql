-- Read-only. Run after the normal morning report time in India.
-- Returns aggregate counts only. No messages, employee details, or push tokens.
select report_type, report_date, count(*) as browser_events,
       count(*) filter (where expires_at > now()) as unexpired_events
from public.erp539_buddy_push
where report_date >= (now() at time zone 'Asia/Kolkata')::date - 1
group by report_type, report_date
order by report_date desc, report_type;

select data->>'report_type' as report_type, data->>'report_date' as report_date,
       count(*) as android_jobs,
       count(*) filter (where delivered_at is not null) as completed_jobs,
       count(*) filter (where delivered_at is null and expires_at > now()) as pending_jobs
from public.mma613_jobs
where source = 'buddy'
  and data->>'report_date' >= ((now() at time zone 'Asia/Kolkata')::date - 1)::text
group by 1, 2
order by 2 desc, 1;
