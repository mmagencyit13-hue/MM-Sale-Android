/* Optional icons only: existing App navigation and data permissions are retained. */
(()=>{'use strict';
const specs=[['sale','CEO Overview / Sale','dashboard'],['outstanding','Outstanding','outstanding'],['credit','Credit Limit Alerts','buyers'],['commission','Commission','commissionHub'],['executive','Executive / Team Snapshot','employeeMaster'],['crm','CRM / Follow Up','crmWorkspace'],['attendance','All Employee Attendance','attendanceSheet'],['tasks','Tasks Overdue','helperWork'],['remarks','Remarks / CEO Instructions',null],['more','More Tools','appHome'],['orders','Orders','orders'],['work','Task','myWork'],['chat','Chat',null],['account','Account',null]];
const box=document.createElement('section');box.className='card';box.id='executiveExtras600';box.hidden=true;box.innerHTML='<h3>Additional Tools</h3><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px" data-extra-icons600></div>';document.querySelector('main').prepend(box);
const dialog=document.createElement('dialog');dialog.style.cssText='width:96vw;max-width:1200px;height:90dvh;padding:12px;border:0;border-radius:12px';dialog.innerHTML='<button type="button" style="margin-bottom:8px">← Back to App</button><iframe title="Additional Tool" style="width:100%;height:calc(100% - 48px);border:0"></iframe>';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.querySelector('iframe').src='about:blank');
const employee=()=>window.ERPEmployeeAuth?.employee;
function permit(e,key,action){const r=e?.permissions?._executiveExtras600?.[key];return r?.show===true&&(action==='show'||r.click===true)}
function open(key){const e=employee();if(!permit(e,key,'click'))return;const spec=specs.find(x=>x[0]===key);if(!spec)return;
 if(key==='chat'||key==='account')return window.MMAAppTab410?.(key);
 if(key==='remarks'){return alert('CEO Instructions ke liye existing CEO authorization bhi required hai. Extra icon alone se CEO rights nahi milte.');}
 localStorage.setItem('mma_mobile_profile_v410',JSON.stringify(e));const url=new URL('erp/index.html',location.href);url.searchParams.set('mobile_page',spec[2]);dialog.querySelector('iframe').src=url.href;dialog.showModal();
}
let signature='';function render(){const e=employee(),isCEO=/\b(ceo|admin|administrator)\b/i.test(e?.role_name||e?.designation||'');if(!e||isCEO){box.hidden=true;return}const next=e.id+'|'+JSON.stringify(e.permissions?._executiveExtras600||{});if(next===signature)return;signature=next;const list=box.querySelector('[data-extra-icons600]');list.replaceChildren();for(const[key,label]of specs){if(!permit(e,key,'show'))continue;const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=!permit(e,key,'click');button.onclick=()=>open(key);list.append(button)}box.hidden=!list.children.length;}
setInterval(render,1000);window.MMAExecutiveExtras600={permit,specs,render};
})();
