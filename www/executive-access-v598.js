(()=>{'use strict';
const employee=()=>window.ERPEmployeeAuth?.employee;
const ceo=e=>/\b(ceo|admin|administrator)\b/i.test(e?.role_name||e?.designation||'');
function can(e,key,action='click'){if(!e||ceo(e))return true;const r=e.permissions?._executive598?.[key];return !r||(r.show===true&&(action==='show'||r[action]===true))}
function target(el){if(el.dataset.tab)return el.dataset.tab;if(el.dataset.order)return el.dataset.order;if(['checkInAction','checkOutAction'].includes(el.id))return 'attendance';return null}
window.addEventListener('click',e=>{const el=e.target.closest('button,a');if(!el)return;const key=target(el);if(key&&!can(employee(),key)){e.preventDefault();e.stopImmediatePropagation();alert('Team Role: this App icon is not allowed.')}},true);
function apply(){const e=employee();if(!e||ceo(e))return;for(const el of document.querySelectorAll('[data-tab],[data-order],#checkInAction,#checkOutAction')){const key=target(el);if(key&&!can(e,key,'show'))el.hidden=true;if(key){el.disabled=!can(e,key);el.setAttribute('aria-disabled',String(!can(e,key)))}}}
// Existing app permission checks remain mandatory; App-specific checks only restrict them.
const show=MMARole410.show,save=MMARole410.save,render=MMARole410.render;
MMARole410.show=function(e,key,module){return can(e,{orders:'order',attendance:'attendance',dashboard:'reports475'}[key]||key,'show')&&show(e,key,module)};
MMARole410.save=function(e,key,module){return can(e,key==='orders'?'fill':key)&&save(e,key,module)};
MMARole410.render=function(...args){const r=render.apply(this,args);apply();return r};
let queued=false;new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;apply()})}}).observe(document.querySelector('main'),{childList:true,subtree:true});
setInterval(()=>{apply();const tab=window.MMAAppTab410;if(tab&&!tab.role598){const next=function(key,...args){if(!can(employee(),key))return;return tab.call(this,key,...args)};next.role598=true;window.MMAAppTab410=next}},1000);
window.MMAExecutive598={can,apply};
})();
