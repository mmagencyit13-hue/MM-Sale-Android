(()=>{'use strict';
const key='mma_activity551',limit=3*60*60*1000;
let internal=false;try{internal=parent!==window&&parent.location.origin===location.origin&&!!parent.ERPEmployeeAuth?.employee}catch{}
if(internal)return;
const now=Date.now();try{const handoff=JSON.parse(sessionStorage.getItem('mma_switch569')||'null');sessionStorage.removeItem('mma_switch569');const local=localStorage.getItem('mma_sales_employee_session_v1');if(handoff&&local&&handoff.token===local&&now-handoff.at>=0&&now-handoff.at<30000&&now-handoff.activity>=0&&now-handoff.activity<limit){const current=Number(localStorage.getItem(key)||0);if(!current||current<handoff.activity)localStorage.setItem(key,String(handoff.activity))}}catch{}const last=Number(localStorage.getItem(key)||0);
if(!last||now-last>limit||last>now){for(const k of ['mma_employee_session_v332','mma_employee_profile_v358','mma_sales_employee_session_v1','mma_mobile_profile_v410'])localStorage.removeItem(k)}
window.MMASession551={key,limit};
})();
