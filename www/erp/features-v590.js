/* V590: V589 with only party checkbox/count placement and history columns adjusted. */
(()=>{'use strict';
 const q=id=>document.getElementById(id),esc=safeHTML;
 const visible=el=>!!el&&!el.hidden&&el.getClientRects().length>0&&!el.closest('[hidden],.hide');
 const keyboardState=new WeakMap();const keyboardStyle=document.createElement('style');keyboardStyle.textContent='#buyers [data-order-head589],#suppliers [data-order-head589],#buyers [data-order-cell589],#suppliers [data-order-cell589]{width:76px;min-width:64px;max-width:90px;font-size:12px;padding:5px;text-align:center}#buyers [data-order-cell589] button,#suppliers [data-order-cell589] button{font-size:12px;padding:2px 4px;min-width:0;width:auto}#buyers [data-select-head590],#suppliers [data-select-head590],#buyers [data-party-tick590],#suppliers [data-party-tick590]{width:30px;min-width:30px;padding:4px;text-align:center}#buyers [data-party-select589],#suppliers [data-party-select589],#buyers [data-select-all589],#suppliers [data-select-all589]{width:15px;min-width:15px;height:15px;margin:0}.kbd589{outline:2px solid #2878b8!important;background:#e4effa!important}';document.head.append(keyboardStyle);
 const pickers='.picker427,.v106Picker,.v115Combo,.v112SearchHost,.v112PartySuggestions,.v73GroupPicker,.buyerItems523,.supplierItems520,.v111ExecutivePicker';
 // Capture before individual picker handlers: Up/Down move among filtered choices, Enter selects.
 window.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.isComposing||!['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key))return;
  const field=e.target,host=field.closest?.(pickers);
  if(host){
   if(e.key==='Escape')return;
   const options=[...host.querySelectorAll('[role="option"],button:not([aria-expanded]),.v111Options label,[data-items520] label')].filter(el=>visible(el)&&!el.disabled&&!el.matches('.v115Trigger,.picker427Button')&&!el.querySelector('input:disabled'));
   if(!options.length)return;
   const editing=field.matches?.('input[type=search],input[type=text]');let active=editing?(keyboardState.get(host)??-1):options.findIndex(el=>el===field||el.contains(field));
   if(e.key==='Enter'){if(active<0)return;e.preventDefault();e.stopImmediatePropagation();const el=options[active];(el.querySelector('input[type=checkbox]')||el).click();return}
   e.preventDefault();e.stopImmediatePropagation();active=active<0?(e.key==='ArrowDown'?0:options.length-1):Math.max(0,Math.min(options.length-1,active+(e.key==='ArrowDown'?1:-1)));
   const el=options[active];keyboardState.set(host,active);for(const option of options)option.classList.toggle('kbd589',option===el);if(!editing){if(!el.matches('button,input,[tabindex]'))el.tabIndex=-1;el.focus()}el.scrollIntoView({block:'nearest'});return;
  }
  // A main list search navigates that list; ordinary page arrows keep their browser scrolling.
  const page=field.closest?.('.page');if(!page)return;
  if(['ArrowDown','ArrowUp'].includes(e.key)&&field.matches?.('input[type=search],input[id*=search i]')){
   const row=[...page.querySelectorAll('tbody tr')].filter(visible)[e.key==='ArrowDown'?0:Math.max(0,[...page.querySelectorAll('tbody tr')].filter(visible).length-1)];
   if(row){e.preventDefault();e.stopImmediatePropagation();row.tabIndex=-1;row.focus();row.scrollIntoView({block:'nearest'})}return;
  }
  const row=field.closest?.('tbody tr');if(!row)return;
  if(field.matches('input,select,textarea,[contenteditable=true]'))return;
  if(e.key==='Enter'&&field===row){const button=row.querySelector('button.linkBtn,[data-order-count589],button:not(:disabled),a');if(button){e.preventDefault();button.click()}return}
  if(['ArrowDown','ArrowUp'].includes(e.key)){
   const rows=[...row.parentElement.rows].filter(visible),index=rows.indexOf(row),next=rows[index+(e.key==='ArrowDown'?1:-1)];
   if(next){e.preventDefault();e.stopImmediatePropagation();next.tabIndex=-1;next.focus();next.scrollIntoView({block:'nearest'})}
  }
 },true);
 window.addEventListener('input',e=>{const host=e.target.closest?.(pickers);if(host)keyboardState.delete(host)},true);
 // Native datalist inputs and native selects retain their own keyboard handling.
 // Guard broken legacy Back/Refresh handlers only on Buyer/Supplier list/forms.
 let refreshPending=false;
 async function refreshParty(page){
  if(refreshPending)return;refreshPending=true;
  const form=page==='buyerForm'?q('bf'):page==='supplierForm'?q('sf'):null;
  const snapshot=form?[...form.querySelectorAll('input,select,textarea')].filter(el=>el.type!=='file').map(el=>({el,id:el.id,value:el.value,checked:el.checked})):[];
  try{
   await Promise.all([loadB(),loadS()]);
   if(form){refreshMasterControls();for(const x of snapshot){const el=x.id?q(x.id):x.el;if(el?.isConnected){el.value=x.value;if(el.type==='checkbox'||el.type==='radio')el.checked=x.checked}}window.MMADropdowns525?.sync();}
   else{const kind=page==='buyers'?'buyer':'supplier',prefix=kind==='buyer'?'b':'s';for(const id of [prefix+'search',prefix+'filter',kind+'GroupFilter'])if(q(id))q(id).value='';masterPage[kind]=0;if(typeof v88DateState!=='undefined')v88DateState[page]={from:'',to:''};const group=rootFor(kind)?.querySelector('.v73GroupPicker');if(group){const input=group.querySelector('input');if(input)input.value='';const menu=group.querySelector('.v73GroupMenu');if(menu)menu.hidden=true;const clear=group.querySelector('.v73GroupClear');if(clear)clear.hidden=true}if(kind==='buyer'&&typeof v91Executive!=='undefined')v91Executive.value='';(kind==='buyer'?renderB:renderS)();await orderSource(true)}
  }finally{refreshPending=false}
 }
 window.addEventListener('click',e=>{
  const b=e.target.closest?.('button');if(!b||b.disabled)return;
  const page=b.closest('.page')?.id;if(!['buyers','suppliers','buyerForm','supplierForm'].includes(page))return;
  const label=(b.textContent||'').trim();
  if(b.matches('.navBackBtn,.backBuyer,.backSupplier')||/^←?\s*Back\b/i.test(label)){
   e.preventDefault();e.stopImmediatePropagation();if(page==='buyerForm'||page==='supplierForm')openPage(page==='buyerForm'?'buyers':'suppliers',false);else openAppGroup('accounts');return;
  }
  if(/^(?:↻|⟳|🔄)?\s*Refresh\b/i.test(label)){
   e.preventDefault();e.stopImmediatePropagation();const disabled=b.disabled;b.disabled=true;void refreshParty(page).catch(err=>alert('Refresh failed: '+err.message)).finally(()=>b.disabled=disabled);
  }
 },true);
 // Slightly tighter print-only typography for Party List and Commission documents.
 const print=v34Print;
 v34Print=function(html){
  if(['partyList','supplierCommission','supplierCommissionForm','commissionFollowUp','buyerCommission','buyerCommissionHub364','buyerCommissionForm364','buyerCommissionFollow364'].includes(CURRENT_PAGE))
   html+='<style>@media print{body{font-size:13px!important;line-height:1.2}th,td{font-size:12px!important;padding:4px!important}header{padding-bottom:9px!important;margin-bottom:13px!important}h1{font-size:20px!important}h2{font-size:17px!important}tr{break-inside:avoid;page-break-inside:avoid}}</style>';
  return print.call(this,html);
 };
 let orders=null,pending=null,loadedAt=0,identity='',sourceError='';
 const selected={buyer:new Set(),supplier:new Set()};
 const context=()=>String(window.MMA548?.segment||'readymade')+'|'+String(ERPEmployeeAuth.employee?.id||'native-admin');
 const rootFor=kind=>q(kind==='buyer'?'buyers':'suppliers');
 const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
 const executive=o=>{const value=o.historical_executive||o.executive_name||o.executive||o.created_by_name||o.filled_by_name;return value?T.find(t=>String(t.id)===String(value))?.name||value:T.find(t=>[o.sales_executive_team_id,o.executive_id,o.created_by_team,o.created_by,o.team_id].filter(Boolean).includes(t.id))?.name||'—'};
 function reset(){identity=context();orders=null;pending=null;loadedAt=0;sourceError='';selected.buyer.clear();selected.supplier.clear()}
 function forParty(kind,id){return(orders||[]).filter(o=>String(o[kind+'_id'])===String(id)).sort((a,b)=>String(b.order_date).localeCompare(String(a.order_date))||String(a.id).localeCompare(String(b.id)))}
 async function orderSource(force=false){
  if(identity!==context())reset();if(pending)return pending;if(!force&&orders&&Date.now()-loadedAt<60000)return orders;
  const captured=identity;const request=(async()=>{
   try{const rows=await fetchAll(()=>sb.from('orders').select('*,buyers(company_name),suppliers(company_name)').gte('order_date','2024-01-01').lte('order_date',today()).order('id'));
    if(captured!==context())return[];orders=rows;loadedAt=Date.now();sourceError='';return rows;
   }catch(err){if(captured===context())sourceError=err.message;throw err}
   finally{if(captured===context())decorateAll();if(pending===request)pending=null}
  })();pending=request;return request;
 }
 const dialog=document.createElement('dialog');dialog.id='orderHistory589';dialog.style.cssText='width:min(1120px,96vw);max-height:85vh;overflow:auto;border:1px solid #b9c8d6;border-radius:12px;padding:18px';
 dialog.innerHTML='<div class="head"><h2></h2><button type="button" data-close589>Close ×</button></div><p role="status"></p><div class="table"><table><thead><tr><th>Order Date</th><th>Supplier Name</th><th>Executive Name</th></tr></thead><tbody></tbody></table></div>';document.body.append(dialog);
 dialog.querySelector('[data-close589]').onclick=()=>dialog.close();let historyRequest=0;
 async function history(kind,id){
  const request=++historyRequest;dialog.querySelector('h2').textContent=((kind==='buyer'?B:S).find(p=>String(p.id)===id)?.company_name||'Party')+' · Sales Orders';
  const status=dialog.querySelector('[role=status]'),body=dialog.querySelector('tbody');status.textContent='Loading…';body.replaceChildren();if(!dialog.open)dialog.showModal();
  try{await orderSource(true);if(request!==historyRequest||!dialog.open)return;const rows=forParty(kind,id);status.textContent=rows.length+' orders · 01-01-2024 to '+today().split('-').reverse().join('-');
   body.innerHTML=rows.map(o=>'<tr><td>'+esc(String(o.order_date||'').slice(0,10).split('-').reverse().join('-'))+'</td><td>'+esc(o.suppliers?.company_name||S.find(p=>p.id===o.supplier_id)?.company_name||'—')+'</td><td>'+esc(executive(o))+'</td></tr>').join('')||'<tr><td colspan="3">No orders in this period.</td></tr>';
  }catch(err){if(request===historyRequest)status.textContent='Order history unavailable: '+err.message}
 }
 const canPrint=kind=>!ERPEmployeeAuth.isEmployee||v92Right(kind==='buyer'?'buyers':'suppliers')?.print===true;
 async function printSelected(kind){
  if(!canPrint(kind))throw Error('Team Role: Print right required.');
  const rows=(kind==='buyer'?B:S).filter(p=>selected[kind].has(String(p.id)));if(!rows.length)throw Error('Select at least one '+kind+'.');
  const win=window.open('','_blank');if(!win)throw Error('Allow print popups and retry.');
  try{const font=await MMAEnvelope421.loadFont();if(win.closed)return;
   const pages=rows.map(p=>{const c=MMAEnvelope421.partyConfig(kind,p),layout=MMAEnvelope421.layout(c);return '<section class="envelope589">'+MMAEnvelope421.recipient(c,layout)+'</section>'}).join('');
   win.document.write('<!doctype html><html><head><title>Selected Envelopes</title><style>@font-face{font-family:EnvelopeTimes;src:url(data:font/ttf;base64,'+font+')}@page{size:11in 5in;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}.envelope589{position:relative;width:279.4mm;height:127mm;overflow:hidden;break-after:page;page-break-after:always}.envelope589:last-child{break-after:auto;page-break-after:auto}.recipient589{position:absolute;font-family:EnvelopeTimes,"Times New Roman",serif;color:#000}.recipient589 strong{font-size:16pt;line-height:6.8mm}.address589{font-size:14pt;font-weight:bold;line-height:1.2;margin-top:3mm;overflow-wrap:anywhere}.mobile589{font-size:14pt;margin-top:5mm}</style></head><body>'+pages+'<script>window.onload=async()=>{await document.fonts.ready;(function fit(){for(const el of document.querySelectorAll(\'.recipient595\')){let scale=1;const parent=el.parentElement;const bottom=parent.getBoundingClientRect().bottom-10;while(el.getBoundingClientRect().bottom>bottom&&scale>.65){scale-=.025;el.style.setProperty(\'--scale595\',String(scale))}}})();window.focus();window.print()};<\/script></body></html>');win.document.close();
  }catch(err){win.close();throw err}
 }
 function decorate(kind){
  const root=q(kind==='buyer'?'buyers':'suppliers'),body=q(kind==='buyer'?'brows':'srows');if(!root||!body)return;
  const head=root.querySelector('thead tr');if(!head)return;
  if(!head.querySelector('[data-order-head589]')){const th=document.createElement('th');th.dataset.orderHead589='';th.textContent='Order Count';head.append(th);const select=document.createElement('th');select.dataset.selectHead590='';select.innerHTML='<label><input type="checkbox" data-select-all589="'+kind+'" aria-label="Select all '+kind+'s on this page"></label>';head.insertBefore(select,head.firstElementChild)}
  const executiveHeader=[...head.children].find(th=>th.textContent.trim()==='Executive'),countHeader=head.querySelector('[data-order-head589]');if(executiveHeader&&countHeader&&executiveHeader.nextElementSibling!==countHeader)executiveHeader.after(countHeader);
  for(const tr of body.querySelectorAll('tr[data-party-id]')){
   const id=tr.dataset.partyId;let cell=tr.querySelector('[data-order-cell589]');
   if(!cell){cell=document.createElement('td');cell.dataset.orderCell589='';const link=document.createElement('button');link.type='button';link.className='linkBtn';link.dataset.orderCount589=id;link.dataset.partyKind589=kind;link.title='Orders from 01-01-2024 to today';link.onclick=()=>void history(kind,id);cell.append(link);tr.append(cell);const tick=document.createElement('td'),input=document.createElement('input');input.type='checkbox';input.dataset.partySelect589=kind;input.value=id;input.setAttribute('aria-label','Select '+kind+' '+((kind==='buyer'?B:S).find(p=>String(p.id)===id)?.company_name||id));input.onchange=()=>{input.checked?selected[kind].add(id):selected[kind].delete(id);decorate(kind)};tick.dataset.partyTick590='';tick.append(input);tr.insertBefore(tick,tr.firstElementChild)}
   const executiveCell=tr.querySelector('[data-party-field=executive]');if(executiveCell&&executiveCell.nextElementSibling!==cell)executiveCell.after(cell);
   const button=cell.firstChild,text=orders?String(forParty(kind,id).length):sourceError?'Retry':'…';if(button.textContent!==text)button.textContent=text;button.title=sourceError||'Orders from 01-01-2024 to today';
   tr.querySelector('[data-party-select589]').checked=selected[kind].has(id);
  }
  const checks=[...body.querySelectorAll('[data-party-select589]')],all=head.querySelector('[data-select-all589]');all.checked=!!checks.length&&checks.every(c=>c.checked);all.indeterminate=checks.some(c=>c.checked)&&!all.checked;all.onchange=()=>{for(const c of checks){all.checked?selected[kind].add(c.value):selected[kind].delete(c.value)}decorate(kind)};
  let print=root.querySelector('[data-bulk-envelope589]');if(!print){print=document.createElement('button');print.type='button';print.dataset.bulkEnvelope589='';print.onclick=()=>void printSelected(kind).catch(err=>alert(err.message));root.querySelector('.headActions')?.append(print)}
  const label='Print Selected Envelopes ('+selected[kind].size+')';if(print.textContent!==label)print.textContent=label;print.hidden=!canPrint(kind);print.disabled=!selected[kind].size;
 }
 function decorateAll(){decorate('buyer');decorate('supplier')}
 for(const [kind,id]of [['buyer','brows'],['supplier','srows']]){const body=q(id);new MutationObserver(()=>{decorate(kind);if(CURRENT_PAGE===(kind==='buyer'?'buyers':'suppliers')&&!orders&&!pending&&!sourceError)void orderSource().catch(()=>{})}).observe(body,{childList:true});}
 const open=openPage;openPage=function(id,...args){const result=open.call(this,id,...args);if(['buyers','suppliers'].includes(id)&&CURRENT_PAGE===id){decorateAll();void orderSource().catch(()=>{})}return result};
 const previousLoadOrders=loadOrders;loadOrders=async function(...args){const result=await previousLoadOrders.apply(this,args);orders=null;loadedAt=0;if(['buyers','suppliers'].includes(CURRENT_PAGE))await orderSource(true);return result};
 sb.auth.onAuthStateChange(()=>{reset();historyRequest++;if(dialog.open)dialog.close();setTimeout(()=>{if(['buyers','suppliers'].includes(CURRENT_PAGE))void orderSource().catch(()=>{})},0)});decorateAll();if(['buyers','suppliers'].includes(CURRENT_PAGE))void orderSource().catch(()=>{});
 window.MMA589={forParty,executive,refreshParty,reset,printSelected};
})();
