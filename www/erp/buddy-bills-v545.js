/* V545: Buyer Master classified ledger gross sales and FY opening. */
(()=>{'use strict';
const cache=new Map(),pending=new Map();
const actor=()=>String(window.ERPEmployeeAuth?.employee?.id||'');
function period(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(now);
 const y=Number(parts.find(p=>p.type==='year').value),m=Number(parts.find(p=>p.type==='month').value),start=y-(m<4?1:0);
 return {from:start+'-04-01',to:(start+1)+'-04-01',label:start+'–'+String(start+1).slice(-2)};
}
async function total(name,fy){
 const key=actor()+'|'+fy.from+'|'+name,old=cache.get(key);if(old&&Date.now()-old.time<30000)return old.amount;
 const client=typeof sb!=='undefined'?sb:window.sb;if(!client)throw Error('Data connection unavailable');
 const found=await client.from('buyers').select('id,company_name').eq('company_name',name).limit(2);
 if(found.error)throw found.error;if(found.data?.length!==1)throw Error('Buyer could not be identified');
 const buyerId=found.data[0].id, ledgerClient=client,partySource={};
 async function fetchAll(make){const rows=[];for(let offset=0;;offset+=500){const r=await make().range(offset,offset+499);if(r.error)throw r.error;if(!Array.isArray(r.data))throw Error('Invalid ledger data');rows.push(...r.data);if(r.data.length<500)return rows;}}
 function v29Category(line){const p=String(line.particular||"").toUpperCase().replace(/[\s/-]+/g,"_"),v=String(line.voucher_type||"").toUpperCase();if(p.includes("DISCOUNT")||v.includes("DISCOUNT"))return"discount";if(p.includes("SALE_RETURN")||p==="GR"||v.includes("CREDIT NOTE")||v.includes("CREDIT_NOTE"))return"gr";if(p==="RECEIPT"||v.includes("RECEIPT")||v==="PAYMENT")return"receipt";if(p==="SALE"||v.includes("SALES"))return"sale";if(p.includes("OPENING")||p==="OB"||p==="O_B"||v.includes("OPENING")||v==="OB"||v==="O/B")return"opening";return"other"}function v29Entry(x,kind,ref,date,dr,cr){return{created_at:x.created_at||"",source_id:x.id||"",buyer_id:x.buyer_id,supplier_id:x.supplier_id,date:date||x.ledger_date||"",kind:kind,ref:ref||x.ref_no||"",dr:Number(dr)||0,cr:Number(cr)||0,source:x.source||""}}function isDuplicateOpening(x,historicalPairs){return String(x.source||"").startsWith("FY_ROLLOVER_")&&historicalPairs.has(x.buyer_id+"|"+x.supplier_id)}async function v29LoadSources(){const[heads,lines,sales,payments]=await Promise.all([fetchAll(()=>ledgerClient.from("ledger_entries").select("*").eq("buyer_id",buyerId).order("id")),fetchAll(()=>ledgerClient.from("ledger_entry_lines").select("*,ledger_entries!inner(buyer_id)").eq("ledger_entries.buyer_id",buyerId).order("id")),fetchAll(()=>ledgerClient.from("sale_invoices").select("*").eq("buyer_id",buyerId).order("id")),fetchAll(()=>ledgerClient.from("payments").select("*").eq("buyer_id",buyerId).order("id"))]);partySource.ledger=heads;partySource.sales=sales;partySource.payments=payments;const headMap=new Map(heads.map(h=>[h.id,h])),used=new Map,entries=[];const history=new Set(heads.filter(h=>h.source==="HISTORICAL_IMPORT_2025_26").map(h=>h.buyer_id+"|"+h.supplier_id));partySource.historicalPairs=history;for(const l of lines){const h=headMap.get(l.ledger_entry_id);if(!h)continue;if(isDuplicateOpening(h,history))continue;const amount=Number(l.amount)||0,side=String(l.entry_type||"").toUpperCase(),dr=side==="DEBIT"?amount:0,cr=side==="CREDIT"?amount:0,category=v29Category(l);entries.push(v29Entry({...h,created_at:l.created_at||h.created_at,id:l.id||h.id},category,l.voucher_no||h.ref_no,l.ledger_date||h.ledger_date,dr,cr));let t=used.get(h.id)||{dr:0,cr:0};t.dr+=dr;t.cr+=cr;used.set(h.id,t)}for(const h of heads){if(isDuplicateOpening(h,history))continue;let t=used.get(h.id),dr=Number(h.debit_amount)||0,cr=Number(h.credit_amount)||0;if(!t){entries.push(v29Entry(h,String(h.source||"").startsWith("FY_ROLLOVER_")?"opening":"other",h.original_ref_no||h.ref_no,h.ledger_date,dr,cr));continue}let extraDr=dr-t.dr,extraCr=cr-t.cr;if(Math.abs(extraDr)>.01||Math.abs(extraCr)>.01){if(extraDr<0){extraCr-=extraDr;extraDr=0}if(extraCr<0){extraDr-=extraCr;extraCr=0}entries.push(v29Entry(h,"other",(h.original_ref_no||h.ref_no)+" · header adjustment",h.ledger_date,extraDr,extraCr))}}for(const x of sales)entries.push(v29Entry(x,"invoice",x.invoice_no||x.original_ref_no||x.ref_no,x.invoice_bill_date,Number(x.total_amount)||0,0));for(const x of payments)entries.push(v29Entry(x,"payment",x.original_receipt_no||x.receipt_no,x.receipt_date,0,Number(x.amount)||0));partySource.ledgerItems=entries;return entries}function v30DeduplicateRollovers(){let entries=partySource.ledgerItems||[],firstReal=new Map;for(const e of entries){if(String(e.source||"").startsWith("FY_ROLLOVER_"))continue;let key=e.buyer_id+"|"+e.supplier_id,d=String(e.date||"").slice(0,10);if(d&&(!firstReal.has(key)||d<firstReal.get(key)))firstReal.set(key,d)}partySource.ledgerItems=entries.filter(e=>{let rollover=String(e.source||"").startsWith("FY_ROLLOVER_"),oldOpening=e.kind==="opening"&&e.source==="HISTORICAL_IMPORT_2025_26";if(!rollover&&!oldOpening)return true;let start=String(e.date||"").slice(0,4)+"-04-01",first=firstReal.get(e.buyer_id+"|"+e.supplier_id);return!(first&&first<start)})}
 await v29LoadSources();v30DeduplicateRollovers();
 let sale=0,opening=0;for(const e of partySource.ledgerItems){const date=String(e.date||'').slice(0,10);if(!date||date>=fy.to)continue;
 if(date<fy.from||e.kind==='opening')opening+=e.dr-e.cr;
 else if(e.kind==='invoice'||e.kind==='sale')sale+=e.dr;
 }
 const amount={sale,opening,entries:partySource.ledgerItems,buyerId};cache.set(key,{time:Date.now(),amount});return amount;
}

async function sharedTotal(name,fy){const key=actor()+'|'+fy.from+'|'+name;if(pending.has(key))return pending.get(key);const job=total(name,fy).finally(()=>pending.delete(key));pending.set(key,job);return job;}
async function breakdown(name){const data=await sharedTotal(name,period()),groups=new Map();const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
for(const e of data.entries){const d=String(e.date||'').slice(0,10);if(!d||d>today)continue;const id=e.supplier_id||'';groups.set(id,(groups.get(id)||0)+e.dr-e.cr);}
const client=typeof sb!=='undefined'?sb:window.sb;const ids=[...groups.keys()].filter(Boolean);const names=new Map();for(let i=0;i<ids.length;i+=100){const r=await client.from('suppliers').select('id,company_name').in('id',ids.slice(i,i+100));if(r.error)throw r.error;for(const x of r.data||[])names.set(x.id,x.company_name);}
return [...groups].filter(([,amount])=>Math.abs(amount)>=.005).map(([id,amount])=>({supplier:id?(names.get(id)||'Supplier unavailable'):'Unassigned supplier',amount})).sort((a,b)=>a.supplier.localeCompare(b.supplier));}
async function correct(rows){const fy=period();return Promise.all(rows.map(async h=>{
 const p=h.payload;if(p?.kind!=='text'||!/^Total bills\s*:/im.test(p.text||'')||!/^Outstanding\s*:/im.test(p.text||''))return h;
 const name=String(p.text).split(/\r?\n/)[0].trim();let label;
 try{const amount=await sharedTotal(name,fy),money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n);label='Opening (FY '+fy.label+'): '+money(amount.opening)+'\nTotal bills (FY '+fy.label+'): '+money(amount.sale);}
 catch{label='Opening (FY '+fy.label+'): Unable to load. Please retry.\nTotal bills (FY '+fy.label+'): Unable to load. Please retry.';}
 return {...h,payload:{...p,text:p.text.replace(/^Total bills\s*:[^\r\n]*/im,label)}};
 }));}
window.MMABuddyBills545={correct,period,breakdown};
})();
