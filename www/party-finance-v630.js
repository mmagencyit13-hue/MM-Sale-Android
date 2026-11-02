/* Shared, read-only mobile finance model; mirrors the desktop ledger source rules. */
(() => {
 'use strict';
 const n=v=>Number(String(v??0).replace(/,/g,''))||0;
 const cents=v=>Math.round((n(v)+Number.EPSILON)*100);
 const amount=v=>v/100;
 const day=v=>String(v||'').slice(0,10);
 function category(line) {
  const p=String(line.particular||'').toUpperCase().replace(/[\s/-]+/g,'_'),v=String(line.voucher_type||'').toUpperCase();
  if(p.includes('DISCOUNT')||v.includes('DISCOUNT'))return 'discount';
  if(p.includes('SALE_RETURN')||p==='GR'||v.includes('CREDIT NOTE')||v.includes('CREDIT_NOTE'))return 'gr';
  if(p==='RECEIPT'||v.includes('RECEIPT')||v==='PAYMENT')return 'receipt';
  if(p==='SALE'||v.includes('SALES'))return 'sale';
  if(p.includes('OPENING')||p==='OB'||p==='O_B'||v.includes('OPENING')||v==='OB'||v==='O/B')return 'opening';
  return 'other';
 }
 function entries(data) {
  const heads=data.ledger_entries||[],headMap=new Map(heads.map(h=>[String(h.id),h])),used=new Map(),rows=[];
  const history=new Set(heads.filter(h=>h.source==='HISTORICAL_IMPORT_2025_26').map(h=>h.buyer_id+'|'+h.supplier_id));
  const duplicate=h=>String(h.source||'').startsWith('FY_ROLLOVER_')&&history.has(h.buyer_id+'|'+h.supplier_id);
  const push=(h,kind,ref,date,dr,cr,source,id)=>rows.push({id:String(id||h.id),source:source||h.source||'',buyer_id:h.buyer_id||'',supplier_id:h.supplier_id||'',date:day(date),kind,ref:ref||'',dr:cents(dr),cr:cents(cr),remark:h.remark||h.remarks||'',entry:{...h},created_at:h.created_at||''});
  for(const l of data.ledger_entry_lines||[]){const h=headMap.get(String(l.ledger_entry_id));if(!h||duplicate(h))continue;const a=n(l.amount),side=String(l.entry_type||'').toUpperCase(),dr=side==='DEBIT'?a:0,cr=side==='CREDIT'?a:0;
   push({...h,remark:l.remark||h.remark},category(l),l.voucher_no||h.ref_no,l.ledger_date||h.ledger_date,dr,cr,h.source,l.id);const t=used.get(String(h.id))||{dr:0,cr:0};t.dr+=cents(dr);t.cr+=cents(cr);used.set(String(h.id),t);}
  for(const h of heads){if(duplicate(h))continue;const t=used.get(String(h.id)),dr=cents(h.debit_amount),cr=cents(h.credit_amount);if(!t){push(h,String(h.source||'').startsWith('FY_ROLLOVER_')?'opening':'other',h.original_ref_no||h.ref_no,h.ledger_date,amount(dr),amount(cr));continue;}
   let a=dr-t.dr,b=cr-t.cr;if(Math.abs(a)>1||Math.abs(b)>1){if(a<0){b-=a;a=0;}if(b<0){a-=b;b=0;}push(h,'other',(h.original_ref_no||h.ref_no||'')+' · adjustment',h.ledger_date,amount(a),amount(b));}}
  for(const x of data.sale_invoices||[])push(x,'invoice',x.invoice_no||x.original_ref_no||x.ref_no,x.invoice_bill_date||x.invoice_date,x.total_amount,0,'sale_invoices');
  for(const x of data.payments||[])push(x,'payment',x.original_receipt_no||x.receipt_no,x.receipt_date,0,x.amount,'payments');
  const first=new Map();for(const e of rows){if(String(e.source).startsWith('FY_ROLLOVER_'))continue;const k=e.buyer_id+'|'+e.supplier_id;if(e.date&&(!first.has(k)||e.date<first.get(k)))first.set(k,e.date);}
  return rows.filter(e=>{const rollover=String(e.source).startsWith('FY_ROLLOVER_'),old=e.kind==='opening'&&e.source==='HISTORICAL_IMPORT_2025_26',d=first.get(e.buyer_id+'|'+e.supplier_id);return !(rollover||old)||!(d&&d<e.date.slice(0,4)+'-04-01');}).sort((a,b)=>a.date.localeCompare(b.date)||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
 }
 function totals(rows,from,to){const t={opening:0,sale:0,returns:0,discount:0,receiving:0,outstanding:0,debit:0,credit:0,count:0};for(const e of rows){if(!e.date||e.date>to)continue;t.outstanding+=e.dr-e.cr;
  if(e.date<from||e.kind==='opening'){t.opening+=e.dr-e.cr;continue;}t.count++;t.debit+=e.dr;t.credit+=e.cr;if(['sale','invoice'].includes(e.kind))t.sale+=e.dr;if(e.kind==='gr')t.returns+=e.cr-e.dr;if(e.kind==='discount')t.discount+=e.cr-e.dr;if(['receipt','payment'].includes(e.kind))t.receiving+=e.cr-e.dr;}
  return Object.fromEntries(Object.entries(t).map(([k,v])=>[k,['count'].includes(k)?v:amount(v)]));}
 function groups(rows,key,masters,from,to){const map=new Map();for(const e of rows){const id=String(e[key]||'');if(!map.has(id))map.set(id,[]);map.get(id).push(e);}return [...map].map(([id,items])=>({id,name:masters.find(p=>String(p.id)===id)?.name||'Unassigned party',city:masters.find(p=>String(p.id)===id)?.city||'',rows:items,totals:totals(items,from,to)})).sort((a,b)=>a.name.localeCompare(b.name));}
 // Same pending-bill definition as desktop MMABill404: financial activity and no bill ADDED in billRange.
 function pendingBills(parties,rows,bills,financialRange,billRange){const grouped=new Map();for(const r of rows){const key=String(r.supplier_id);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(r);}const billed=new Set(bills.filter(b=>{const d=b.created_at?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(b.created_at)):'';return d>=billRange.from&&d<=billRange.to;}).map(b=>String(b.supplier_id)));return parties.filter(p=>{const x=totals(grouped.get(String(p.id))||[],financialRange.from,financialRange.to);if(![x.opening,x.sale,x.receiving].some(v=>Math.abs(v)>.005))return false;
  return !billed.has(String(p.id));}).sort((a,b)=>a.name.localeCompare(b.name));}
 window.MMAPartyFinance630={entries,totals,groups,pendingBills,amount};
})();
