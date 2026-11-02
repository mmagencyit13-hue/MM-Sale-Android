(()=>{'use strict';
function addedDate(value){if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'2-digit',year:'numeric'}).format(d).replaceAll('/','-')}
const previous=csvExport;
csvExport=function(filename,rows,...args){const match=/^MM_Agency_(buyer|supplier)_/i.exec(filename);if(match){const list=match[1].toLowerCase()==='buyer'?B:S;rows=rows.map(row=>{const id=row.id||row.ID||row._Supplier_ID493,p=list.find(x=>String(x.id)===String(id))||list.find(x=>x.company_name===(row.company_name||row.Name||row.Company));const result={...row};delete result['Added Date'];return{...result,'Added Date':addedDate(p?.created_at)}})}return previous.call(this,filename,rows,...args)};
window.MMAAdded598={addedDate};
})();
