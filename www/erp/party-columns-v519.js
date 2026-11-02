(()=>{'use strict';
// Header and value share one identity. Rendering never changes party records.
const fields={'buyer':'party','supplier':'party','buyer group':'group','supplier group':'group','city':'city','owner name':'owner','mobile':'mobile','commission':'commission','executive':'executive','executive name':'executive','opening':'opening','sales':'sale','sale return':'return','discount':'discount','receipt':'receipt','outstanding':'outstanding','status':'status','remarks':'remarks','approval':'approval','commission bill':'bill','actions':'actions','action':'actions'};
function align(kind){
 const body=document.getElementById(kind==='buyer'?'brows':'srows');if(!body)return;
 const head=body.closest('table').querySelector('thead tr');if(!head)return;
 const columns=[...head.cells].map(th=>{const key=fields[th.textContent.trim().toLowerCase()];if(key)th.dataset.partyField=key;return key});
 for(const row of body.rows){if(!row.dataset.partyId)continue;
  const bill=row.querySelector('[data-v404-status]');if(bill)bill.dataset.partyField='bill';
  const cells=new Map([...row.cells].map(td=>[td.dataset.partyField,td]));
  if(columns.some(key=>!key||!cells.has(key))){console.error('Party column identity missing',kind,row.dataset.partyId);continue}
  const ordered=columns.map(key=>cells.get(key));
  if(ordered.some((cell,i)=>row.cells[i]!==cell))row.replaceChildren(...ordered);
 }
}
for(const [kind,fn] of [['buyer','renderB'],['supplier','renderS']]){
 const prior=window[fn];window[fn]=function(...args){const result=prior.apply(this,args);align(kind);return result};
 const body=document.getElementById(kind==='buyer'?'brows':'srows');
 new MutationObserver(()=>align(kind)).observe(body,{childList:true});
 align(kind);
}
window.MMAPartyColumns519={align};
})();
