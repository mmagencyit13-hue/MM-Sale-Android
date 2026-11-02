(()=>{'use strict';
let actor=null;
const key=(window.MMA548?.segment==='grey'?'grey:mma_desktop_page518':'mma_desktop_page518');
function save(){if(!actor||document.getElementById('app').classList.contains('hide'))return;try{sessionStorage.setItem(key,JSON.stringify({actor,page:CURRENT_PAGE}))}catch{}}
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){actor=null;sessionStorage.removeItem(key)}else if(session?.user)actor=session.user.id});
Promise.resolve(window.ERPPageReady).finally(async()=>{document.getElementById('startup518')?.remove();try{const r=await sb.auth.getSession();actor=r.data.session?.user?.id||null}catch{}});
})();
