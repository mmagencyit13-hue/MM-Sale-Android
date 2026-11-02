/* V591: scoped export, numeric field, commission display and credit hint corrections. */
(()=>{'use strict';
 const q=id=>document.getElementById(id);
 const roots=['saleForm','ledgerForm','buyerForm','supplierForm','supplierCommission','supplierCommissionForm','buyerCommission','buyerCommissionForm364','commissionFollowUp','buyerCommissionFollow364'];
 const style=document.createElement('style');
 style.textContent=roots.map(id=>'#'+id+' input[type=number]::-webkit-inner-spin-button,#'+id+' input[type=number]::-webkit-outer-spin-button').join(',')+'{-webkit-appearance:none;margin:0}'+roots.map(id=>'#'+id+' input[type=number]').join(',')+'{-moz-appearance:textfield;appearance:textfield}#buyers [data-v404-head],#buyers [data-v404-status],#suppliers [data-v404-head],#suppliers [data-v404-status]{display:none!important}#supplierCommission .stat:has(#scTotalBase){display:none!important}#commissionEdit532 input[type=number]{-moz-appearance:textfield;appearance:textfield}#commissionEdit532 input[type=number]::-webkit-inner-spin-button,#commissionEdit532 input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.hiddenAutoReference591{display:none!important}.creditLimitLabel591{position:relative}.creditLimitLabel591 #bcredit{padding-right:105px}.creditLimitHint591{position:absolute;right:12px;bottom:12px;font-size:12px;font-weight:500;color:#526578;pointer-events:none}.creditLimitHint591[hidden]{display:none!important}';
 document.head.append(style);
 function limitLabel(value){
  if(value===null||value===undefined||String(value).trim()==='')return '';
  const n=Number(value);if(!Number.isFinite(n))return '';
  const fixed=x=>Number(x.toFixed(2)).toLocaleString('en-IN',{maximumFractionDigits:2});
  return Math.abs(n)>=1e7?fixed(n/1e7)+' Crore':Math.abs(n)>=1e5?fixed(n/1e5)+' Lakh':'₹'+fixed(n);
 }
 const credit=q('bcredit');if(credit){const label=credit.closest('label'),hint=document.createElement('small');hint.id='creditLimitHint591';hint.className='creditLimitHint591';hint.setAttribute('aria-live','polite');label.classList.add('creditLimitLabel591');label.append(hint);const update=()=>{hint.textContent=limitLabel(credit.value);hint.hidden=!hint.textContent};credit.addEventListener('input',update);credit.addEventListener('change',update);const form=credit.form;form?.addEventListener('reset',()=>setTimeout(update,0));const edit=window.editB;window.editB=async function(...args){const result=await edit.apply(this,args);update();return result};update()}
 const moneyKey=key=>!/(count|s\.?no|serial)/i.test(key)&&/(amount|commission|gross|discount|deduction|gst|adjustment|rate|final|base|subtotal|total|net|%)/i.test(key);
 const autoBillKey=key=>['bill','billno','billnumber','ref','refno','refid','reference'].includes(String(key).toLowerCase().replace(/[^a-z0-9]/g,''));
 function commissionExport(rows){return rows.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>!autoBillKey(key)).map(([key,value])=>[key,moneyKey(key)&&value!==''&&value!==null&&value!==undefined&&Number.isFinite(Number(value))?Number(value).toFixed(2):value])))}
 const exportRows=csvExport;csvExport=function(filename,rows,...args){return exportRows.call(this,filename,/commission/i.test(filename)&&Array.isArray(rows)?commissionExport(rows):rows,...args)};
 function hideColumns(table,pattern){
  const head=table?.querySelector('thead tr');if(!head)return;
  const indexes=[...head.children].map((cell,i)=>pattern.test(cell.textContent.trim())?i:-1).filter(i=>i>=0);
  for(const index of indexes){head.children[index].classList.add('hiddenAutoReference591');for(const row of table.querySelectorAll('tbody tr'))if(row.cells.length>1&&row.cells[index])row.cells[index].classList.add('hiddenAutoReference591')}
 }
 function commissionSummary(){
  const base=q('scTotalBase');if(base)base.closest('.stat').hidden=true;
  for(const[id,label]of [['scTotalBills','Total Commission Count'],['scTotalCommission','Commission Amount']]){const span=q(id)?.closest('.stat')?.querySelector('span');if(span&&span.textContent!==label)span.textContent=label}
  const buyer=q('buyerCommission');if(buyer){let summary=buyer.querySelector('[data-summary591]');if(!summary){summary=document.createElement('div');summary.className='stats';summary.dataset.summary591='';summary.innerHTML='<div class="stat"><b data-count591>0</b><span>Total Commission Count</span></div><div class="stat"><b data-amount591>₹0.00</b><span>Commission Amount</span></div>';buyer.querySelector('.head')?.after(summary)}
   const rows=[...buyer.querySelectorAll('[data-bc-rows] tr')].filter(tr=>tr.querySelector('[data-bc-delete]'));
   const ids=rows.map(tr=>tr.querySelector('[data-bc-delete]').dataset.bcDelete),total=ids.reduce((sum,id)=>sum+Number(BC364.find(b=>String(b.id)===String(id))?.commission_amount||0),0);
   summary.querySelector('[data-count591]').textContent=String(rows.length);summary.querySelector('[data-amount591]').textContent=scMoney(total);
  }
 }
 function updateTables(){for(const id of ['commissionFollowUp','buyerCommissionFollow364'])for(const table of q(id)?.querySelectorAll('table')||[])hideColumns(table,/^(Bill\s*(No\.?|Number)|Ref\s*(ID|No\.?))/i);hideColumns(q('salerows')?.closest('table'),/^(Ref\s*No\.?|Reference\b)/i);for(const body of [q('scRows'),q('buyerCommission')?.querySelector('[data-bc-rows]')])hideColumns(body?.closest('table'),/^Bill\s*(No\.?|Number)\b/i);commissionSummary()}
 // Observe rows only, so hiding cells cannot create a mutation loop.
 for(const body of [q('salerows'),q('scRows'),q('buyerCommission')?.querySelector('[data-bc-rows]'),...[...['commissionFollowUp','buyerCommissionFollow364']].flatMap(id=>[...q(id)?.querySelectorAll('tbody')||[]])].filter(Boolean))new MutationObserver(updateTables).observe(body,{childList:true});
 const open=openPage;openPage=function(...args){const result=open.apply(this,args);updateTables();return result};
 // Make-new form back goes to its own existing list, not the recursive legacy history handler.
 window.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b||b.disabled)return;const page=b.closest('.page')?.id;if(!['supplierCommissionForm','buyerCommissionForm364'].includes(page))return;if(!(b.matches('.navBackBtn,[data-back]')||/^(?:←\s*)?(Back|Cancel)\b/i.test(b.textContent.trim())))return;e.preventDefault();e.stopImmediatePropagation();const make=q(page==='supplierCommissionForm'?'v287Make':'bc287Make');if(make)make.click();else openPage(page==='supplierCommissionForm'?'supplierCommission':'buyerCommission',false)},true);
 const print=v34Print;v34Print=function(html){
  if(/commission/i.test(CURRENT_PAGE)){
   const parsed=new DOMParser().parseFromString('<!doctype html><html><body>'+html+'</body></html>','text/html');
   // Remove the automatic bill number from print-list columns, retaining Tally Bill No.
   for(const table of parsed.querySelectorAll('table')){const head=table.querySelector('thead tr');if(!head)continue;const indexes=[...head.children].map((th,i)=>/^Bill(?:\s*(?:No\.?|Number))?\s*$/i.test(th.textContent.replace(/[▾▼↕]/g,'').trim())?i:-1).filter(i=>i>=0).reverse();for(const i of indexes){for(const row of table.rows)if(row.cells.length>i&&row.cells.length>1)row.cells[i].remove()}}
   for(const label of parsed.querySelectorAll('b,strong'))if(/^(Ref(?:erence)?(?:\s*(?:ID|No\.?))?\.?|Bill\s*(?:No\.?|Number))\s*:?$/i.test(label.textContent.trim())){const parent=label.parentElement;if(parent?.tagName==='DIV'&&parent.children.length<=3)parent.remove()}
   html=parsed.head.innerHTML+parsed.body.innerHTML+'<style>@media print{header{padding-bottom:6px!important;margin-bottom:8px!important}h3{margin:7px 0!important}header p{margin:3px 0!important}}</style>';
  }
  return print.call(this,html);
 };
 updateTables();window.MMA591={limitLabel,commissionExport,autoBillKey};
})();
