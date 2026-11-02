/* V512: additive Excel import. No existing form or submit handler is replaced. */
(()=>{'use strict';
const normalize=v=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();
function parseDelimited(text,delimiter='\t'){
 text=String(text??'').replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,atStart=true;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c;continue}
  if(c==='"'&&atStart){quoted=true;atStart=false;continue}if(c===delimiter){row.push(cell);cell='';atStart=true;continue}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';atStart=true;continue}cell+=c;atStart=false;
 }
 if(quoted)throw Error('A quoted Excel cell is incomplete. Copy all selected cells again.');
 if(cell!==''||row.length){row.push(cell);rows.push(row)}return rows.filter(r=>r.some(c=>c.trim()!==''));
}
function csvCell(value){const text=String(value??'');return '"'+text.replace(/"/g,'""')+'"'}
function columns(m){return m.viewColumns||[{key:'entry_group',label:'Entry Group (optional)',type:'text'},...m.fields.map(f=>({...f,key:'header.'+f.key})),...m.lineFields.map(f=>({...f,key:'line.'+f.key,label:'Item: '+f.label}))]}
function dateValue(value){let v=String(value).trim(),y,m,d;if(/^\d{4}-\d{2}-\d{2}$/.test(v))[y,m,d]=v.split('-').map(Number);else{const hit=v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);if(!hit)throw Error('Use DD-MM-YYYY or YYYY-MM-DD');[,d,m,y]=hit.map(Number)}
 const dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw Error('Invalid date');return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function valueFor(value,col){const text=String(value??'').trim();if(text==='')return null;
 if(col.type==='date')return dateValue(text);
 if(['numeric','integer','bigint','smallint','real','double precision'].includes(col.type)){
  const n=text.replace(/[₹,\s]/g,'');if(!/^-?\d+(\.\d+)?$/.test(n)||!Number.isFinite(Number(n)))throw Error('Invalid number');
  if(['integer','bigint','smallint'].includes(col.type)&&!Number.isInteger(Number(n)))throw Error('Whole number required');return n;
 }
 if(col.type==='boolean'){if(/^(true|yes|1)$/i.test(text))return true;if(/^(false|no|0)$/i.test(text))return false;throw Error('Use Yes/No or True/False')}
 if(col.type==='jsonb'||col.type==='json'||col.type==='ARRAY'){const parsed=JSON.parse(text);if(col.type==='ARRAY'&&!Array.isArray(parsed))throw Error('Use a JSON array');return parsed}return text;
}
function readMatrix(matrix,m){const cols=columns(m),byName=new Map;
 for(const c of cols)for(const name of[c.key,c.label,c.label.replace(' (optional)','')])byName.set(normalize(name),c.key);
 let header=false,mapping=cols.map(c=>c.key),rows=matrix;
 if(matrix.length){const found=matrix[0].map(v=>byName.get(normalize(v)));const n=found.filter(Boolean).length;
  if(n>=Math.min(2,cols.length)){header=true;const unknown=matrix[0].filter((v,i)=>v.trim()&&!found[i]);if(unknown.length)throw Error('Unknown template columns: '+unknown.join(', '));
   const used=found.filter(Boolean);if(new Set(used).size!==used.length)throw Error('A column header appears more than once');mapping=found;rows=matrix.slice(1)}
 }
 const flat=rows.map((r,index)=>{if(r.length>mapping.length&&r.slice(mapping.length).some(v=>v.trim()))throw Error('Row '+(index+1)+': more values than template columns');const out=Object.fromEntries(cols.map(c=>[c.key,'']));r.forEach((v,i)=>{if(mapping[i])out[mapping[i]]=v});return out});return {flat,header};
}
function buildEntries(flat,m){const cols=columns(m),groups=new Map;const errors=[];
 flat.forEach((row,i)=>{const commissionGroup=['supplierCommission','buyerCommission'].includes(m.key)&&String(row['header.bill_no']||'').trim()?JSON.stringify(['company','supplier_name','buyer_name','bill_no','punch_date'].map(k=>String(row['header.'+k]||'').trim())):'';const group=String(row.entry_group||commissionGroup||((m.key==='orders'?row['header.ref_id']:m.key==='payments'?row['header.receipt_no']:'')||'')).trim(),key=group?'group:'+group:'row:'+i;let e=groups.get(key);
  if(!e){e={row_no:i+1,payload:{header:{},lines:[]},sourceRows:[],errors:[]};groups.set(key,e)}e.sourceRows.push(i);
  const h={},l={};for(const col of cols){if(col.key==='entry_group'||col.displayOnly)continue;const raw=row[col.key]??'';let v;
   try{v=valueFor(raw,col)}catch(error){e.errors.push('Row '+(i+1)+' · '+col.label+': '+error.message);v=String(raw)}
   const [kind,...rest]=col.key.split('.');(kind==='header'?h:l)[rest.join('.')]=v;
  }
  for(const [k,v]of Object.entries(h)){const prev=e.payload.header[k];if(prev!=null&&v!=null&&JSON.stringify(prev)!==JSON.stringify(v))e.errors.push('Entry Group '+group+': header values differ for '+k);if(prev==null)e.payload.header[k]=v}
  if(Object.values(l).some(v=>v!=null))e.payload.lines.push(l);
 });
 for(const e of groups.values()){defaults(e.payload,m);for(const f of m.fields)if(f.required&&e.payload.header[f.key]==null)e.errors.push(f.label+' is blank');errors.push(...e.errors)}return {entries:[...groups.values()],errors};
}
function defaults(p,m){const h=p.header,n=k=>Number(h[k]||0),today=new Date().toISOString().slice(0,10);
 if(m.key==='payments'){
 h.entry_date??=today;
 const [y,month]=h.entry_date.split('-').map(Number),start=y-(month<4?1:0);
 h.financial_year=start+'-'+(start+1);
}
 if(['supplierCommission','buyerCommission'].includes(m.key)){
 const mode=normalize(h.calc_type).replace(/^by\s+/,'');if(mode==='receipt')h.calc_type='RECEIPT';else if(mode==='bill')h.calc_type='BILL';
 if(h.punch_date&&/^\d{4}-\d{2}-\d{2}$/.test(h.punch_date)){const [y,month]=h.punch_date.split('-').map(Number),start=y-(month<4?1:0);h.financial_year=start+'-'+(start+1)}
 }
 if(['supplierFollow','buyerFollow'].includes(m.key))h.entry_date??=today;
 if(m.key==='serviceDates'){h.meeting_date=h.client_dating;h.purpose??='Client Dating'}
 if(m.key==='serviceLeads'){h.lead_type??='Buyer';h.next_followup=h.next_calling_date;h.requirements=h.item_required}
 if(m.key==='serviceReturns'){h.gr_reference??='SR-'+crypto.randomUUID();h.dispatch_date??=h.agency_received_date;h.parcel_count??=1}
 if(m.key==='cashReceived')h.actual_amount=String(n('received_amount')-n('transfer_charges'));
 if(m.key==='cashTransfer'){h.commission_amount=String(n('paid_amount')*n('commission_percent')/100);h.final_paid_amount=String(n('paid_amount')-n('transfer_charges')-Number(h.commission_amount))}
}
function flattenPayload(payload,m){payload=JSON.parse(JSON.stringify(payload));Object.assign(payload.header,payload.context?.display||{});const cols=columns(m),lines=payload.lines?.length?payload.lines:[{}];return lines.map(l=>Object.assign({entry_group:'EDIT'},Object.fromEntries(cols.map(c=>[c.key,c.key==='entry_group'?'EDIT':((c.key.startsWith('header.')?payload.header:l)?.[c.key.slice(c.key.indexOf('.')+1)]??'')]).map(([k,v])=>[k,typeof v==='object'?JSON.stringify(v):(cols.find(c=>c.key===k)?.type==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(String(v))?String(v).split('-').reverse().join('-'):String(v))]))))}
const core={parseDelimited,csvCell,columns,dateValue,valueFor,readMatrix,buildEntries,flattenPayload};
if(typeof module!=='undefined'&&module.exports){module.exports=core;return}window.MMAImportCore512=core;
const configs=window.MMAImportConfig512||[],q=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let admin=null,readyPromise=null,dialog=null,current=null,flat=[],batch='',busy=false,edit=null,results=new Map,request=0,selectedPage=null,lastPoll=0;
const panels=new Map;
async function rpc(name,args){const r=await sb.rpc(name,args);if(r.error)throw Error(r.error.message);return r.data}
async function ready(){if(window.ERPEmployeeAuth?.isEmployee)throw Error('Use Admin login for bulk Excel Import. Your normal Add Entry remains available.');if(admin!==null){if(!admin)throw Error('Admin login is required for Excel Import');return}
 if(!readyPromise)readyPromise=rpc('erp512_is_admin',{}).then(r=>{admin=r===true;if(!admin)throw Error('Admin login is required for Excel Import')}).catch(e=>{admin=null;throw e}).finally(()=>readyPromise=null);return readyPromise;
}
function style(){const el=document.createElement('style');el.textContent=`
.importIssue521{background:#fff7db!important;color:#854d0e}.importBar512{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0;padding:10px 12px;background:#f0f6f8;border:1px solid #d9e6e9;border-radius:9px}.importBar512 select{width:auto;max-width:310px}.importBar512 button{background:#176373}.importPanel512[hidden]{display:none!important}.importPanel512{border:1px solid #ead6d6;border-radius:9px;margin:10px 0;overflow:hidden}.importPanel512 table{min-width:680px}.importPending512{background:#fff0f0;color:#9e2424}.importPanel512 td{padding:9px}.importStatus512{font-size:13px;color:#536577;margin:7px 0}.importDialog512{width:min(1450px,97vw);max-height:94vh;border:1px solid #b9cdd1;border-radius:13px;padding:18px;color:#172033}.importDialog512::backdrop{background:#10223080}.importDialog512 h2{margin:0}.importDialog512 .tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}.importDialog512 .tools button{background:#176373}.importDialog512 .gridWrap{overflow:auto;max-height:46vh;border:1px solid #d7e3e6}.importDialog512 table{border-collapse:collapse;min-width:100%;width:max-content}.importDialog512 th{position:sticky;top:0;z-index:1;background:#e9f1f4;max-width:220px;min-width:150px;padding:8px;font-size:12px;white-space:normal}.importDialog512 td{padding:0;border:1px solid #e1e8ec;min-width:150px;max-width:220px;white-space:pre-wrap;font-size:13px}.importDialog512 td[contenteditable]{padding:7px;outline-color:#176373}.importDialog512 td:first-child{min-width:48px}.importDialog512 textarea{display:block;width:100%;box-sizing:border-box;height:90px;min-height:70px;font:13px monospace}.importDialog512 .pending{background:#fff0f0}.importDialog512 .ok{background:#eefaf3}.importDialog512 .summary{white-space:pre-wrap;font-size:13px;max-height:100px;overflow:auto}.importDialog512 small{display:block;color:#596a7c;line-height:1.5}.importDialog512 input[type=file]{width:230px}.importDialog512 [hidden]{display:none!important}.importHidden512{display:none!important}
`;document.head.append(el)}
function ensureDialog(){if(dialog)return;dialog=document.createElement('dialog');dialog.className='importDialog512';dialog.innerHTML='<div class="head"><h2 data-import-title></h2><button type="button" data-action="close">Close ×</button></div><small data-import-help></small><div class="tools"><button type="button" data-action="download">Download Template</button><button type="button" data-action="copy">Copy Headers</button><label>CSV / TSV<input type="file" accept=".csv,.tsv,.txt" data-import-file></label><button type="button" data-action="clear">Clear Grid</button></div><label>Paste Excel cells here<textarea data-import-paste placeholder="Copy columns from Excel and paste here; rows appear automatically"></textarea></label><div class="tools"><span data-import-count></span></div><div class="gridWrap"><table><thead></thead><tbody></tbody></table></div><p class="summary" data-import-status role="status"></p><div class="tools"><button type="button" data-action="submit">Import Entries</button><button type="button" data-action="close">Close</button></div>';
 let pasteTimer;dialog.querySelector('[data-import-paste]').addEventListener('input',()=>{clearTimeout(pasteTimer);pasteTimer=setTimeout(()=>{try{loadText(dialog.querySelector('[data-import-paste]').value)}catch(e){message(e.message)}},150)});
 document.body.append(dialog);dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});dialog.addEventListener('close',()=>{if(!busy){request++;flat=[];results.clear();edit=null;current=null}});
 dialog.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action)void act(action)});
 dialog.querySelector('[data-import-file]').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error('Maximum file size is 10 MB');const text=await file.text(),delimiter=/\.csv$/i.test(file.name)?',':'\t';loadText(text,delimiter)}catch(error){message(error.message)}};
 dialog.querySelector('tbody').addEventListener('input',e=>{const cell=e.target.closest('[data-cell]');if(!cell||busy)return;flat[Number(cell.dataset.row)][cell.dataset.cell]=cell.textContent;results.clear();updateCount()});
 dialog.querySelector('tbody').addEventListener('paste',e=>{const cell=e.target.closest('[data-cell]');if(!cell||busy)return;e.preventDefault();try{const matrix=parseDelimited(e.clipboardData.getData('text/plain')),cols=columns(current),start=cols.findIndex(c=>c.key===cell.dataset.cell),row=Number(cell.dataset.row);if(row+matrix.length>2000)throw Error('Paste up to 2,000 Excel rows at a time');
  matrix.forEach((r,i)=>{if(r.length+start>cols.length)throw Error('Pasted data extends beyond the template');while(flat.length<=row+i)flat.push(blank());r.forEach((v,j)=>flat[row+i][cols[start+j].key]=v)});results.clear();renderGrid();
 }catch(error){message(error.message)}});
}
const blank=()=>Object.fromEntries(columns(current).map(c=>[c.key,'']));
function message(text){if(dialog)dialog.querySelector('[data-import-status]').textContent=text}
function updateCount(){const nonempty=flat.filter(r=>columns(current).some(c=>c.key!=='entry_group'&&String(r[c.key]??'').trim()));const built=buildEntries(nonempty,current);dialog.querySelector('[data-import-count]').textContent=`${nonempty.length} Excel rows · ${built.entries.length} entries`;return built}
function renderGrid(){const cols=columns(current);dialog.querySelector('thead').innerHTML='<tr><th>#</th>'+cols.map(c=>'<th title="'+esc(c.key)+'">'+esc(c.label)+(c.required?' *':'')+'</th>').join('')+'<th>Result</th></tr>';
 dialog.querySelector('tbody').innerHTML=flat.map((r,i)=>{const result=results.get(i);return '<tr class="'+(result?(result.status==='imported'?'ok':missingParty(result)?'pending':'importIssue521'):'')+'"><td>'+(i+1)+'</td>'+cols.map(c=>'<td contenteditable="'+(!busy&&!results.size)+'" data-row="'+i+'" data-cell="'+esc(c.key)+'">'+esc(r[c.key])+'</td>').join('')+'<td>'+esc(result?(result.status==='imported'?('Imported'+(result.target_ref?' · '+result.target_ref:'')):result.issue||'Pending'):'')+'</td></tr>'}).join('');updateCount();}
function loadText(text,delimiter='\t'){if(busy)return;flat=readMatrix(parseDelimited(text,delimiter),current).flat;if(flat.length>2000)throw Error('Paste up to 2,000 Excel rows at a time');batch=crypto.randomUUID();results.clear();renderGrid();message('Check every column. Blank cells remain blank. Red errors can be corrected in Pending Imports after saving.')}
async function open(m,pending=null){try{await ready();ensureDialog();current=m;edit=pending;batch=crypto.randomUUID();results.clear();flat=pending?flattenPayload(pending.payload,m):[];
 dialog.querySelector('[data-import-title]').textContent=(pending?'Edit Red Import · ':'Excel Import · ')+m.title;
 dialog.querySelector('[data-import-help]').textContent=(['supplierCommission','buyerCommission'].includes(m.key)?'Commission: fill row amounts and bill totals. For a multi-row bill, repeat Bill No., Company and main party; enter totals once or repeat identical totals. Type: By Receipt / By Bill. Financial year follows Commission Punch Date. GST Amount (Total) is the summary GST. Run FIX_V530_COMMISSION_IMPORT.sql before importing. ':'')+'Copy Excel cells in this template column order. Dates: DD-MM-YYYY. Optional columns can be blank. Missing/ambiguous parties are saved in red until corrected. Attachment columns accept existing file URLs/paths.';
 dialog.querySelector('[data-import-paste]').value='';dialog.querySelector('[data-import-file]').value='';dialog.querySelector('[data-action=submit]').textContent=pending?'Save & Retry Entry':'Import Entries';renderGrid();message('');dialog.showModal();
 }catch(error){alert(error.message.includes('erp512_')?'Run SETUP_V512_EXCEL_IMPORT.sql first. '+error.message:error.message)}}
function download(){const cols=columns(current),blob=new Blob(['\uFEFF'+cols.map(c=>csvCell(c.label)).join(',')+'\r\n'],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=current.key+'_Import_Template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function act(action){try{if(busy)return;if(action==='close')return dialog.close();if(action==='download')return download();if(action==='copy'){await navigator.clipboard.writeText(columns(current).map(c=>c.label).join('\t'));return message('Headers copied. Paste them into the first row of Excel.')}
 if(action==='clear'){if(edit)throw Error('Edit the saved row values.');flat=[];batch=crypto.randomUUID();results.clear();renderGrid();return message('Grid cleared')}
 if(action==='preview')return loadText(dialog.querySelector('[data-import-paste]').value);
 if(action==='submit')return await submit();
 }catch(error){message(error.message)}}
async function resolveReferences(payload,m){
 for(const [key,table,field] of [['carried_by','team_members','name'],['order_id','orders','ref_id'],['sale_invoice_id','sale_invoices','invoice_no']]){
 const value=payload.header[key];if(!value||/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value))continue;
 const r=await sb.from(table).select('*').eq(field,value).limit(3);if(r.error)throw Error(r.error.message);
 const rows=(r.data||[]).filter(x=>!payload.header.buyer_name||!x.buyer_name||normalize(x.buyer_name)===normalize(payload.header.buyer_name));
 if(rows.length!==1)throw Error(key+': '+value+' was not uniquely found. Correct this value before importing.');
 payload.context.display={...payload.context.display,[key]:value};payload.header[key]=rows[0].id;
 }
}
async function submit(){await ready();const activeRows=flat.filter(r=>columns(current).some(c=>c.key!=='entry_group'&&String(r[c.key]??'').trim()));if(!activeRows.length)throw Error('Paste or enter at least one entry');flat=activeRows;const built=buildEntries(activeRows,current);
 if(built.errors.some(s=>s.includes('header values differ')))throw Error(built.errors.filter(s=>s.includes('header values differ')).join('\n'));
 for(const e of built.entries){if(edit){e.payload.header={...edit.payload.header,...e.payload.header};e.payload.lines=e.payload.lines.map((l,i)=>({...edit.payload.lines?.[i],...l}))};e.payload.context=edit?.payload.context||{financial_year:typeof currentFY==='function'?currentFY():''}}
 for(const e of built.entries)await resolveReferences(e.payload,current);
 if(edit&&built.entries.length!==1)throw Error('An edited pending row must remain one entry');
 busy=true;const seq=++request,m=current;dialog.querySelectorAll('button,input,textarea').forEach(e=>e.disabled=true);renderGrid();message('Saving entries… Keep this window open.');
 try{const received=[];if(edit){const edited=await rpc('erp512_edit',{p_id:edit.id,p_revision:edit.revision,p_payload:built.entries[0].payload});received.push(Array.isArray(edited)?edited[0]:edited)}else for(let offset=0;offset<built.entries.length;offset+=50){const chunk=built.entries.slice(offset,offset+50);const saved=await rpc('erp512_submit',{p_batch:batch,p_module:m.key,p_rows:chunk.map(e=>({row_no:e.row_no,payload:e.payload}))});received.push(...(Array.isArray(saved)?saved:[saved]));message(`Saved ${Math.min(offset+50,built.entries.length)} / ${built.entries.length} entries…`)}
 if(seq!==request)return;received.forEach((r,i)=>{for(const n of built.entries[i]?.sourceRows||[])results.set(n,r)});const ok=received.filter(r=>r.status==='imported').length;message(`${ok} imported · ${received.length-ok} pending (red: new party, yellow: validation). Imported amounts now use the normal Ledger, Outstanding, Reports and Dashboard calculations. Pending rows will post after correction.`);
 await refreshNative(m);await loadPanels();
 }catch(error){message('Import response interrupted: '+error.message+'. Click Import Entries again to safely retry this same batch. Do not clear the grid.')}finally{busy=false;dialog.querySelectorAll('button,input,textarea').forEach(e=>e.disabled=false);renderGrid()}
}
async function refreshNative(m){window.MMADashboard400?.invalidate?.();window.dispatchEvent(new CustomEvent('mma-import-saved512',{detail:{module:m.key}}));try{localStorage.setItem('mma-import-updated512',String(Date.now()))}catch{}
 const calls={sales:()=>loadSales(),payments:()=>loadPayments(),ledger:()=>loadLedgerEntries(),orders:()=>loadOrders(),buyers:()=>loadB(),suppliers:()=>loadS(),supplierCommission:()=>loadSupplierCommissions(),buyerCommission:()=>typeof loadBuyerCommissions364==='function'&&loadBuyerCommissions364()};try{await calls[m.key]?.()}catch{}
 if(m.key==='supplierFollow'){await window.MMAFollow493?.loadState?.();q('v287Refresh')?.click()}if(m.key==='buyerFollow')q('bc287Refresh')?.click();
 if(m.key.startsWith('master_')){try{await loadMasters();refreshMasterControls()}catch{}}
 if(m.key==='printCompany'){try{await v39LoadProfiles()}catch{}}
 if(['serviceDates','serviceLeads','serviceReturns','serviceChequeHandover'].includes(m.key)){try{await service69Load(m.key,{resetForm:false})}catch{}}
 document.dispatchEvent(new CustomEvent('mma-native-import-refresh512',{detail:{module:m.key}}));
}
function selectedConfig(page){const ids=configs.filter(m=>m.pages.includes(page.id));if(page.id==='masters'||page.id==='masterForm'){try{const table=masterTable(page.id==='masterForm'?q('masterCategory').value:MASTER_CAT);const match=ids.find(m=>m.table===table);if(match)return match}catch{}}return ids[0]}
function missingParty(r){return /^(Buyer|Supplier) not found:/i.test(r.issue||'')}
function installPage(page){const matches=configs.filter(m=>m.pages.includes(page.id));if(!matches.length)return;let state=panels.get(page);if(state&&page.contains(state.bar))return;
 const bar=document.createElement('div');bar.className='importBar512';bar.innerHTML='<button type="button" data-import-open>Import Excel</button>'+(matches.length>1?'<select aria-label="Entry template">'+matches.map(m=>'<option value="'+esc(m.key)+'">'+esc(m.title)+'</option>').join('')+'</select>':'')+'<label>Colour <select data-import-colour aria-label="Import colour filter"><option value="all">All</option><option value="red">🔴 New Buyer / Supplier</option><option value="issues">🟡 Other validation issues</option><option value="normal">Normal</option><option value="imported">Imported / Delete</option></select></label><button type="button" data-import-refresh>Refresh Imports</button><button type="button" data-import-export-missing>Export New Parties</button><span class="importStatus512" role="status"></span>';
 const panel=document.createElement('div');panel.className='importPanel512';panel.hidden=true;const head=page.querySelector(':scope > .head,:scope > .workHead');if(head)head.after(bar);else page.prepend(bar);bar.after(panel);
 const initial=selectedConfig(page);state={bar,panel,m:initial,colour:'all',rows:[],page:0};panels.set(page,state);if(bar.querySelector('select:not([data-import-colour])'))bar.querySelector('select:not([data-import-colour])').value=initial.key;
 bar.querySelector('[data-import-open]').onclick=()=>void open(state.m);bar.querySelector('[data-import-colour]').onchange=e=>{state.colour=e.target.value;state.page=0;void loadPanel(page,state)};
 bar.querySelector('select:not([data-import-colour])')?.addEventListener('change',e=>{state.m=configs.find(m=>m.key===e.target.value);state.page=0;void loadPanel(page,state)});
 bar.querySelector('[data-import-export-missing]').onclick=async()=>{try{await ready();const all=await fetchAll(()=>sb.from('erp512_import_rows').select('*').eq('module',state.m.key).eq('status','pending').or('issue.ilike.Buyer not found:%,issue.ilike.Supplier not found:%').order('id'));csvExport(state.m.key+'_New_Parties.csv',all.filter(missingParty).map(r=>({Buyer:r.payload.header.buyer_name||'',Buyer_City:r.payload.header.buyer_city||'',Supplier:r.payload.header.supplier_name||'',Supplier_City:r.payload.header.supplier_city||'',Issue:r.issue,...r.payload.header})));}catch(error){bar.querySelector('[role=status]').textContent=error.message}};
 bar.querySelector('[data-import-refresh]').onclick=async()=>{
 const button=bar.querySelector('[data-import-refresh]');if(button.disabled)return;button.disabled=true;
 const module=state.m.key;let attempted=0,imported=0,cursor=null,cutoff=null;
 try{await ready();let more=true;while(more){
  const r=await rpc('erp525_retry_page',{p_module:module,p_after_created:cursor?.created||null,p_after_id:cursor?.id||null,p_until:cutoff,p_limit:50});
  if(!r||!Number.isInteger(r.attempted)||typeof r.has_more!=='boolean')throw Error('Run FIX_V525_IMPORT_RETRY_PAGING.sql before using Refresh Imports.');
  attempted+=r.attempted;imported+=Number(r.imported)||0;cutoff=r.until;
  if(r.has_more&&(!r.attempted||cursor&&cursor.created===r.after_created&&cursor.id===r.after_id))throw Error('Retry cursor did not advance. Retry Refresh Imports.');
  cursor={created:r.after_created,id:r.after_id};more=r.has_more;
  bar.querySelector('[role=status]').textContent=attempted+' checked · '+imported+' imported…';
 }await refreshNative(state.m);state.page=0;await loadPanel(page,state);
 bar.querySelector('[role=status]').textContent=attempted+' checked · '+imported+' imported · '+(attempted-imported)+' still pending. Review Red / Yellow issue details.';
 }catch(error){bar.querySelector('[role=status]').textContent=attempted+' checked · '+imported+' confirmed imported. Refresh Imports failed: '+error.message;try{await refreshNative(state.m);await loadPanel(page,state)}catch{}bar.querySelector('[role=status]').textContent=attempted+' checked · '+imported+' confirmed imported. Refresh Imports failed: '+error.message}
 finally{button.disabled=false}
 };
 panel.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.importDelete){const r=state.rows.find(r=>r.id===b.dataset.importDelete);if(r)void deleteImport(r,state,page);return}if(b.dataset.importEdit){const r=state.rows.find(r=>r.id===b.dataset.importEdit);if(r)void open(state.m,r)}if(b.dataset.importPage){state.page=Math.max(0,state.page+Number(b.dataset.importPage));void loadPanel(page,state)}};
}
async function deleteImport(r,state,page){try{await ready();if(!confirm(r.status==='pending'?'Delete this pending import?':'Delete this imported entry? Related totals will update.'))return;await rpc('erp514_delete_import',{p_id:r.id,p_revision:r.revision});if(['sales','payments','ledger','orders','supplierCommission','buyerCommission','supplierFollow','buyerFollow'].includes(state.m.key)&&typeof v37Refresh==='function')await v37Refresh();if(state.m.key.startsWith('cash'))q('expRefresh')?.click();await refreshNative(state.m);await loadPanel(page,state)}catch(e){alert(e.message)}}
function renderPanel(page,state){const {panel,rows,colour,m}=state;const red=rows.filter(r=>colour==='imported'?r.status==='imported':r.status==='pending'&&(colour==='red'?missingParty(r):colour==='issues'?!missingParty(r):true));panel.hidden=colour==='normal'||!red.length;
 const table=page.querySelector(':scope > .table,:scope > .workTableWrap');if(table)table.classList.toggle('importHidden512',(colour==='red'||colour==='issues'));
 // Some pages put their ordinary tables inside a wrapper/section; never hide Add Entry forms.
 for(const el of page.querySelectorAll('table'))if(!panel.contains(el)&&!el.closest('form'))(el.closest('.table,.workTableWrap')||el).classList.toggle('importHidden512',(colour==='red'||colour==='issues'));
 panel.innerHTML='<p class="importStatus512" style="padding:0 10px">'+(colour==='imported'?'Imported entries':'Pending imports (red = new party, yellow = validation)')+' · '+esc(m.title)+' · amounts post only after matching and validation.</p><div style="overflow:auto"><table><thead><tr><th>Row</th><th>Buyer / Supplier</th><th>Entry details</th><th>Status / Details</th><th>Action</th></tr></thead><tbody>'+red.map(r=>{const h=r.payload.header;const summary=Object.entries(h).filter(([k,v])=>v!==null&&v!==''&&!k.includes('buyer_')&&!k.includes('supplier_')).slice(0,7).map(([k,v])=>k.replace(/_/g,' ')+': '+(/^\d{4}-\d{2}-\d{2}$/.test(String(v))?String(v).split('-').reverse().join('-'):v)).join(' · ');return '<tr class="'+(r.status==='pending'?(missingParty(r)?'importPending512':'importIssue521'):'')+'"><td>'+r.row_no+'</td><td>'+esc([h.buyer_name,h.buyer_city,h.supplier_name,h.supplier_city].filter(Boolean).join(' · '))+'</td><td>'+esc(summary)+'</td><td>'+esc(r.status==='imported'?'Imported · '+(r.target_ref||''):r.issue||'Pending validation')+'</td><td>'+(r.status==='pending'?'<button type="button" data-import-edit="'+r.id+'">Edit</button>':'')+' <button type="button" data-import-delete="'+r.id+'">Delete</button></td></tr>'}).join('')+'</tbody></table></div><div class="importBar512"><button type="button" data-import-page="-1" '+(!state.page?'disabled':'')+'>Previous</button><span>Page '+(state.page+1)+'</span><button type="button" data-import-page="1" '+(rows.length<50?'disabled':'')+'>Next</button></div>';
 state.bar.querySelector('[role=status]').textContent=red.length+(colour==='imported'?' imported entries on this page':' pending entries on this page');
}
async function loadPanel(page,state){try{await ready();let query=sb.from('erp512_import_rows').select('*').eq('module',state.m.key).eq('status',state.colour==='imported'?'imported':'pending');if(state.colour==='red')query=query.or('issue.ilike.Buyer not found:%,issue.ilike.Supplier not found:%');if(state.colour==='issues')query=query.not('issue','ilike','Buyer not found:%').not('issue','ilike','Supplier not found:%');const r=await query.order('created_at',{ascending:false}).order('id').range(state.page*50,state.page*50+49);if(r.error)throw r.error;if(!page.isConnected)return;state.rows=r.data||[];if(!state.rows.length&&state.page>0){state.page--;return loadPanel(page,state)}renderPanel(page,state)}catch(error){state.bar.querySelector('[role=status]').textContent=error.message.includes('erp512')?'Import setup required':error.message}}
async function loadPanels(){await Promise.allSettled([...panels].filter(([p])=>!p.classList.contains('hide')&&!p.hidden).map(([p,s])=>loadPanel(p,s)))}
function scan(){const page=[...document.querySelectorAll('section.page')].find(p=>!p.classList.contains('hide')&&!p.hidden);if(!page||page.closest('#app.hide'))return;installPage(page);const masterKey=(page.id==='masters'||page.id==='masterForm')?selectedConfig(page)?.key:null;
 if(page!==selectedPage||(masterKey&&panels.get(page)?.masterKey!==masterKey)){selectedPage=page;const s=panels.get(page);if(s)s.masterKey=masterKey;if(s){const m=selectedConfig(page);if((page.id==='masters'||page.id==='masterForm')&&m){s.m=m;s.bar.querySelector('select:not([data-import-colour])').value=m.key}void loadPanel(page,s)}}}
document.addEventListener('change',e=>{if(e.target.id==='masterCategory')scan()});
style();new MutationObserver(scan).observe(q('app')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});scan();
setInterval(()=>{if(document.hidden||busy||Date.now()-lastPoll<15000)return;lastPoll=Date.now();void loadPanels()},15000);
window.addEventListener('focus',()=>void loadPanels());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void loadPanels()});
sb.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){admin=null;readyPromise=null;request++;dialog?.close();for(const[p,s]of panels){s.rows=[];renderPanel(p,s)}selectedPage=null}});
window.MMAExcelImport512={open:key=>open(configs.find(m=>m.key===key)),refresh:loadPanels};
})();
