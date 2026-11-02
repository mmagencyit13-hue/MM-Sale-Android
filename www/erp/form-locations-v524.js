(()=>{'use strict';
// Use the same effective lists as the Master page. City/State masters can include
// saved party locations in addition to explicit master_city/master_state rows.
let scope='',snapshots=new Map();
function replace(category,rows){const next=window.MMALists581?.context()||currentFY();if(next!==scope){scope=next;snapshots.clear()}snapshots.set(category,rows)}
const key=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
function names(category,explicit){const next=window.MMALists581?.context()||currentFY();if(next!==scope){scope=next;snapshots.clear()}if(explicit!==undefined)replace(category,explicit);explicit=snapshots.get(category)||[];const current=window.v268MasterRows?.(category)||[];const merged=new Map;const blocked=new Set([...current,...explicit].filter(r=>r.code==='__V270_HIDDEN__'||String(r.status||'Active').toLowerCase()==='inactive').map(r=>key(r.name)));for(const row of [...current,...explicit]){const name=String(row.name||'').trim(),id=key(name);if(!id||blocked.has(id)||row.code==='__V270_HIDDEN__'||String(row.status||'Active').toLowerCase()!=='active')continue;if(!merged.has(id))merged.set(id,name)}return [...merged.values()].sort((a,b)=>a.localeCompare(b))}
window.MMAFormMasters524={names,replace,reset(){scope='';snapshots.clear()}};
})();
