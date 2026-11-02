/* Financial year is derived per exported entry, before date display formatting. */
(()=>{'use strict';
const norm=v=>String(v).toLowerCase().replace(/[^a-z0-9]/g,'');
function financialYear(value){const s=String(value??'').trim();let y,m,d,hit;
 if((hit=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/)))[,y,m,d]=hit.map(Number);
 else if((hit=s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)))[,d,m,y]=hit.map(Number);else return '';
 const dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return '';
 const start=y-(m<4?1:0);return start+'-'+(start+1);
}
function exportRows(rows){return rows?.map(row=>{const entry=Object.keys(row).find(k=>norm(k)==='entrydate');if(!entry)return row;
 const out={...row},fy=financialYear(row[entry]),years=Object.keys(row).filter(k=>['fy','financialyear','year'].includes(norm(k)));
 if(years.length)for(const key of years)out[key]=fy;else out.FY=fy;
 return out;
})}
if(typeof module!=='undefined'&&module.exports){module.exports={financialYear,exportRows};return}
const native=csvExport;csvExport=function(filename,rows,...args){return native.call(this,filename,exportRows(rows),...args)};
})();
