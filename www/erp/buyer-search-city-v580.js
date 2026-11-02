(()=>{'use strict';
const norm=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-IN');
window.MMABuyerSearch580={norm,matches:(text,query)=>norm(query).split(' ').every(word=>norm(text).includes(word))};
const prior=partyFiltered;
partyFiltered=function(kind){if(kind!=='buyer')return prior.apply(this,arguments);const field=document.getElementById('bsearch'),query=field.value;let rows;try{field.value='';rows=prior.apply(this,arguments)}finally{field.value=query}return rows.filter(row=>MMABuyerSearch580.matches([row.company_name,row.buyer_code,row.buyer_group,row.city,row.owner_name,row.owner_mobile,row.gst_no,row.pan_no].join(' '),query))};
// Keep the existing save/edit/GST/draft synchronization and the State picker UI.
const city=document.getElementById('bcity'),select=document.getElementById('bcityMaster523');
if(city&&select){city.removeAttribute('list');city.style.setProperty('display','none','important');city.hidden=true;const style=document.createElement('style');style.textContent='#bcityMaster523[hidden]{display:none!important}#bf label:has(#bcity) .picker427{display:block;width:100%}#bf label:has(#bcity) .picker427Menu{z-index:10005}';document.head.append(style);window.MMASearch427?.mount(select,'City');
const sync=()=>{const value=city.value;select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}))};city.addEventListener('change',()=>{if(select.value!==city.value){if(city.value&&![...select.options].some(o=>o.value===city.value))select.add(new Option(city.value,city.value));sync()}});
}
})();
