/* Readymade routing and existing employee and native Admin session validation. */
(()=>{'use strict';
const manifest=window.MMA548Manifest,tables=new Set(manifest.tables),rpcNames=new Set(manifest.functions),nativeFetch=window.fetch.bind(window);
const origin='https://vuogorddmdumjpquvuqz.supabase.co',endpoint=origin+'/functions/v1/employee-gateway';const selected='readymade';let access='',ready=false,lastToken='',pending=null;
let adminSession='',adminSignature='';function adminBearer(){for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!/^sb-.*-auth-token$/.test(k))continue;try{const v=JSON.parse(localStorage.getItem(k));if(v?.access_token)return v.access_token;}catch{}}return '';}function employeeToken(){return localStorage.getItem('mma_sales_employee_session_v1')||localStorage.getItem('mma_employee_session_v332')||'';}function token(){return employeeToken()||(adminSignature===adminBearer()?adminSession:'');}function identity(){const employee=employeeToken();if(employee)return employee;const bearer=adminBearer();if(bearer){try{const claims=JSON.parse(atob(bearer.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(claims.session_id)return String(claims.sub)+':'+claims.session_id;}catch{}return bearer;}return token();}
async function context(){let t=token();if(!t&&adminBearer()){const bearer=adminBearer();const r=await nativeFetch(endpoint+'?op=admin-chat',{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:'{}'});if(r.ok){const a=await r.json();adminSession=a.token||'';adminSignature=bearer;t=token();}}if(!t){ready=false;access='';lastToken='';return;}if(t===lastToken&&ready)return;ready=false;access='';if(pending)return pending;
const job=(async()=>{const r=await nativeFetch(origin+'/rest/v1/rpc/mma548_context',{method:'POST',headers:{'Content-Type':'application/json',apikey:'sb_publishable_UIGoEgZTS4iE6zcQ0Jbbbg_QDStT0w-'},body:JSON.stringify({p_token:t})});if(!r.ok){ready=false;return;}const c=await r.json();if(token()!==t)return;access=c.access;
ready=access==='readymade'||access==='both';
lastToken=t;
})();pending=job;try{await job}finally{if(pending===job)pending=null;}}
document.documentElement.dataset.business548=selected;
window.MMA548={
 get segment(){return selected},
 get ready(){return ready},
 get access(){return access},
 async change(next){return next===selected&&ready}
};
window.fetch=async(input,init)=>{const request=new Request(input,init),u=new URL(request.url);if(u.origin!==origin)return nativeFetch(request);const path=u.pathname;const name=path.replace(/^\/rest\/v1\/(?:rpc\/)?/,'').split('/')[0],isRPC=path.startsWith('/rest/v1/rpc/');const business=path.startsWith('/rest/v1/')&&(isRPC?rpcNames.has(name):tables.has(name));const isFunction=/^\/functions\/v1\/(employee-gateway|sales-app-gateway|buddy-memory)$/.test(path);
if(!business&&!isFunction)return nativeFetch(request);
if(path.endsWith('/employee-gateway')&&['login','admin-chat','logout','session'].includes(u.searchParams.get('op')))return nativeFetch(request);
await context();const headers=new Headers(request.headers);headers.set('x-mma-segment',selected);
if(!ready&&identity()){
 const message=access==='grey'
   ? 'This account requires Normal business access. Contact your administrator.'
   : 'Business access could not be verified. Please sign in again.';
 return new Response(JSON.stringify({message}),{status:access==='grey'?403:503,headers:{'Content-Type':'application/json'}});
}
let response;
response=await nativeFetch(new Request(request,{headers}));
return response;};
const route=new URL(location.href);
if(route.searchParams.has('business')){
 route.searchParams.delete('business');
 history.replaceState(history.state,'',route.href);
}
document.addEventListener('DOMContentLoaded',()=>void context().catch(()=>{}));
})();
