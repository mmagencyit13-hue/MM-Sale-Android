(()=>{"use strict";
 const isK=value=>/^\s*k\s*$/i.test(String(value||""))||/\(\s*k\s*\)/i.test(String(value||""));
 function followState(events,id,round){
  const all=events.filter(e=>e.commission_id===id),financial=all.filter(e=>!e.tallyOnly495),last=financial.at(-1)||{},tally=[...all].reverse().find(e=>Object.prototype.hasOwnProperty.call(e,"tally"));
  const files=[...new Map(financial.flatMap(e=>e.files||[]).map(f=>[f.name+"|"+f.data,f])).values()];
  return {...last,id:all.at(-1)?.id||"",tally:tally?.tally||"",executive:financial.find(e=>e.executive)?.executive||"",files,remark:[...financial].reverse().find(e=>e.remark)?.remark||"",received:round(financial.reduce((n,e)=>n+Number(e.receipt||0),0)),history:financial,tally_history:all.filter(e=>e.tallyOnly495)};
 }
 function revealKey(event){
  if(event.ctrlKey||event.altKey||event.metaKey||event.isComposing||event.repeat)return false;
  const field=event.target?.closest?.("input,textarea,select,[contenteditable=true],[contenteditable=\"\"]");
  if(field&&!field.readOnly)return false;
  return String(event.key||"").toLowerCase()==="k"||event.code==="KeyK";
 }
 window.MMAK493=Object.freeze({isK,revealKey,matches:(value,kOnly=false)=>isK(value)===!!kOnly,followState});
})();
