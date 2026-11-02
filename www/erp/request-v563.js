(()=>{'use strict';
const readApp=new Set(['catalog','pending','submitted','app-context','health']);
const readChat=new Set(['contacts','history','groups','group-history','help-history','help-inbox','help-lookup','help-profile','help-profiles']);
function isRead(op,args={}){return op==='api'&&['GET','HEAD'].includes(args.method)||op==='session'||op==='rtc-config'||op==='chat'&&readChat.has(args.action)}
async function request(url,init={},options={}){const read=options.read===true,kind=options.kind||'json',timeout=options.timeoutMs||(read?25000:45000);let last;
 if(navigator.onLine===false)throw Object.assign(Error('Internet unavailable. Reconnect and retry; keep this screen open.'),{offline:true,uncertain:false});
 for(let attempt=0;attempt<(read?2:1);attempt++){
  const ctrl=new AbortController,forward=()=>ctrl.abort();let retryable=false;
  if(init.signal?.aborted)throw Object.assign(Error('Request cancelled.'),{name:'AbortError'});
  init.signal?.addEventListener('abort',forward,{once:true});const timer=setTimeout(()=>ctrl.abort(),timeout);
  try{const response=await fetch(url,{...init,signal:ctrl.signal});
   retryable=[429,502,503,504].includes(response.status);
   if(read&&retryable&&attempt===0){try{await response.text()}catch{}continue}
   let data;
   if(kind==='blob'&&response.ok)data=await response.blob();
   else{const text=await response.text();try{data=JSON.parse(text)}catch{if(!response.ok)data={message:'Service unavailable (HTTP '+response.status+'). Please retry.'};else throw Object.assign(Error(read?'Server response was incomplete. Please retry.':'Save confirmation was incomplete. Keep this screen and check the saved entry before retrying.'),{uncertain:!read})}}
   return{response,data};
  }catch(e){const cancelled=init.signal?.aborted;if(cancelled)throw Object.assign(Error('Request cancelled.'),{name:'AbortError'});last=Object.assign(Error(e.name==='AbortError'?(read?'Loading timed out. Please retry.':'Save confirmation timed out. Keep this screen and check the saved entry before retrying.'):e.name==='TypeError'?'Connection interrupted. Please retry.':e.message||'Connection interrupted. Please retry.'),{uncertain:!read,status:e.status,cause:e});if(!read||attempt===1)throw last;
  }finally{clearTimeout(timer);init.signal?.removeEventListener('abort',forward)}
 }
 throw last||Error('Service unavailable. Please retry.');
}
window.MMARequest563={request,isRead,readApp:action=>readApp.has(action)};
})();
