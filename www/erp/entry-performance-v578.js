/* Entry preparation and confirmed-write UI; no credentials or financial records persisted here. */
(()=>{'use strict';
 let masterStamp=null,preparing=new Map();
 const entryPages=new Set(['orderForm','saleForm','ledgerForm','paymentForm']);
 const masterKey=()=>currentFY()+':'+MASTER_CATEGORIES.filter(([cat])=>window.ERPPerformance382?.masterCategory(cat)!==false).map(([cat])=>cat).sort().join(',');
 async function masters(){const key=masterKey();if(masterStamp?.key===key&&masterStamp.rows===MASTER)return;const result=await loadMasters();if(result===false)throw Error('Required entry masters could not load. Please retry.');masterStamp={key,rows:MASTER}}
 async function prepare(id){if(!entryPages.has(id))return;const key=id+':'+currentFY();if(preparing.has(key))return preparing.get(key);const work=Promise.all([B.length?null:loadB(),S.length?null:loadS(),masters()]).then(async()=>{if(id==='orderForm'||id==='saleForm'){const scope=outstandingSourceScope();if(!partySource.ledgerItems||outstandingAccountingScope!==scope||Date.now()-outstandingAccountingReadAt>=30000)await refreshBuyerCreditGuard()}});preparing.set(key,work);try{await work}finally{if(preparing.get(key)===work)preparing.delete(key)}}
 function creditWindow(){
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const year=Number(today.slice(0,4))-(today.slice(5,7)<'04'?1:0);
   return {today,start:year+'-04-01'};
 }
 function creditState(entries, limit, {today} = creditWindow()){
   let paise = 0;
   for (const entry of entries) {
     const date = String(entry.date || '').slice(0, 10);
     if (!date || date > today) continue;
     paise += Math.round(((Number(entry.dr) || 0) - (Number(entry.cr) || 0)) * 100);
   }
   const limitPaise = Math.round(limit * 100);
   return {balance: paise / 100, locked: limitPaise > 0 && paise * 2 > limitPaise};
 }
 const creditMessage = 'Credit Limit Reach. Payment and Ledger Credit entries are allowed.';
 async function credit(id){if(!id)return;const fresh=await sb.from('buyers').select('id,credit_limit').eq('id',id).single();if(fresh.error)throw fresh.error;const buyer=B.find(b=>b.id===id);if(!buyer)throw Error('Selected buyer is unavailable. Reload Buyer list.');buyer.credit_limit=fresh.data.credit_limit;const limit=Number(buyer.credit_limit)||0;if(limit<=0){buyer._creditBlocked=false;return buyer}const source=await readBuyerCredit578(id);v30DeduplicateRollovers(source);const state=creditState(source.ledgerItems,limit);buyer._creditOutstanding=Math.max(0,state.balance);buyer._creditBlocked=state.locked;partyTotals.buyer[id]={...(partyTotals.buyer[id]||v29Empty()),balance:state.balance};return buyer}
 function remember(kind,row,items){if(!row?.id)throw Error('Save confirmation is missing the entry ID.');const value={...row,buyers:B.find(b=>b.id===row.buyer_id)||row.buyers,suppliers:S.find(s=>s.id===row.supplier_id)||row.suppliers,...items?{sale_invoice_items:items}:{}};const rows=kind==='sale'?SI:kind==='ledger'?LE:PAY;const at=rows.findIndex(x=>x.id===row.id);if(at<0)rows.unshift(value);else rows[at]={...rows[at],...value};partySource.ledgerItems=null;window.MMADashboard400?.invalidate?.()}
 function done(kind){let status=document.getElementById('entrySaved578');if(!status){status=document.createElement('p');status.id='entrySaved578';status.setAttribute('role','status');status.style.cssText='padding:10px 14px;background:#e8f6ee;color:#166534;border-radius:7px';document.querySelector('#app>main')?.prepend(status)}status.textContent=(kind==='sale'?'Sale invoice':kind==='ledger'?'Ledger entry':'Payment')+' saved successfully.';const render=kind==='sale'?renderSales:kind==='ledger'?renderLedgerEntries:renderPayments;render()}
 function searchText(value){return String(value??'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
 function matches(value,query){const text=searchText(value),terms=searchText(query).split(/\s+/).filter(Boolean);return terms.every(term=>text.includes(term))}
 function paymentParty(row,kind){return displayParty(kind,row[kind+'_id']).company_name?displayParty(kind,row[kind+'_id']):row[kind==='buyer'?'buyers':'suppliers']||{}}
 function paymentMatch(row,query){const buyer=paymentParty(row,'buyer'),supplier=paymentParty(row,'supplier');return matches([row.receipt_no,row.original_receipt_no,row.payment_mode,row.remarks,buyer.company_name,buyer.city,supplier.company_name,supplier.city].join(' '),query)}
 window.MMAForm578={prepare,masters,credit,creditMessage,creditWindow,creditState,remember,done,entryPages,matches,searchText,paymentParty,paymentMatch};
})();
