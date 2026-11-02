/* Complete, atomic option-list reads. No financial writes or persisted party cache. */
(()=>{'use strict';
 let generation=0,contextKey='',seq=0;const versions=new Map();
 const context=()=>String(window.MMA548?.segment||'readymade')+':'+(typeof currentFY==='function'?currentFY():'');
 function checkContext(){const key=context();if(key!==contextKey){contextKey=key;generation++;versions.clear()}return key}
 function begin(name){checkContext();const ticket={name,seq:++seq,generation,context:contextKey};versions.set(name,ticket.seq);return ticket}
 function current(ticket){return ticket.generation===generation&&ticket.context===context()&&versions.get(ticket.name)===ticket.seq}
 async function read(makeQuery){const rows=[],ids=new Set();let offset=0;const size=750;for(;;){const r=await makeQuery().range(offset,offset+size-1);if(r.error)throw r.error;const page=r.data||[];if(!page.length){if(Number.isFinite(r.count)&&offset<r.count)throw Error('List could not be fully loaded. Please retry.');break}for(const row of page){if(row.id){if(ids.has(row.id))throw Error('List changed while loading. Please retry.');ids.add(row.id)}rows.push(row)}offset+=page.length;if(Number.isFinite(r.count)&&offset>=r.count)break;/* Advance by received rows: gateways can cap each response below the requested size. */}return rows}
 function merge(existing,results){const categories=new Set(results.map(x=>x.cat));return [...existing.filter(row=>!categories.has(row.category)),...results.flatMap(x=>x.rows.map(row=>({...row,category:x.cat})))];}
 function reset(){generation++;versions.clear();contextKey='';delete window.MMALists581.masterContext;window.MMAFormMasters524?.reset()}
 function options(select,...items){const old=[...select.options];if(old.length===items.length&&old.every((o,i)=>o.value===items[i].value&&o.text===items[i].text&&o.disabled===items[i].disabled))return;select.replaceChildren(...items)}
 window.MMALists581={begin,current,read,merge,reset,context,options};
})();
