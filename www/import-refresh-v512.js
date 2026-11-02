/* Refresh live summaries after returning to the app. Existing role checks remain authoritative. */
(()=>{'use strict';let last=0,busy=false;
const visible=el=>el&&!el.hidden&&!el.closest('[hidden],.hide');
async function refresh(force=false){if(document.hidden||busy||(!force&&Date.now()-last<60000)||document.querySelector('dialog[open]'))return;
 const active=document.activeElement;if(active?.matches('input,textarea,select,[contenteditable=true]'))return;
 const ceo=document.querySelector('[data-page="ceo501"]'),dash=document.querySelector('[data-page="dashboard"]');
 if(visible(ceo)){if([...ceo.querySelectorAll('[data-c501-instruction] textarea,[data-c501-instruction] input[name=body]')].some(e=>e.value.trim()))return;busy=true;last=Date.now();try{await window.MMACEO501?.open?.()}catch{}finally{busy=false}}
 else if(visible(dash)&&window.MMADashboard460?.allowed?.(window.ERPEmployeeAuth?.employee)){busy=true;last=Date.now();try{await window.MMADashboard460.open()}catch{}finally{busy=false}}
}
window.addEventListener('focus',()=>void refresh(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh(true)});
window.addEventListener('storage',e=>{if(e.key==='mma-import-updated512')void refresh(true)});setInterval(()=>void refresh(),60000);
})();
