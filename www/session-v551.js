(()=>{'use strict';
const key='mma_activity551',limit=10800000;let expiring=false,lastWrite=0;
async function expire(){if(expiring||!ERPEmployeeAuth.employee)return;expiring=true;try{window.MMASaveScreen551?.();await ERPEmployeeAuth.logout();document.getElementById('app')?.classList.add('hide');document.getElementById('login')?.classList.remove('hide');document.getElementById('loginMessage').textContent='Session ended after 3 hours of inactivity. Please login again.';localStorage.removeItem(key)}finally{expiring=false}}
function check(touch=false){if(!ERPEmployeeAuth.employee)return;const now=Date.now(),last=Number(localStorage.getItem(key)||0);if(!last||now-last>limit||last>now){void expire();return}if(touch&&now-lastWrite>1000&&!document.hidden){lastWrite=now;localStorage.setItem(key,String(now))}}
for(const type of ['pointerdown','keydown','touchstart','scroll'])document.addEventListener(type,()=>check(true),{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();else window.MMASaveScreen551?.()});window.addEventListener('focus',()=>check());setInterval(()=>check(),30000);
sb.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN')localStorage.setItem(key,String(Date.now()));if(event==='SIGNED_OUT')localStorage.removeItem(key)});
navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='mma-chat-route551'){try{const url=new URL(e.data.url);if(url.origin===location.origin)history.replaceState(history.state,'',url.href)}catch{}}});
})();
