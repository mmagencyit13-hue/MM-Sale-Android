(()=>{'use strict';
const q=id=>document.getElementById(id),text=value=>String(value??'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim(),matches=window.MMAPartySearch630.matches;
// Shared search normalization; selection continues to use each actual stored ID/value.
if(window.MMABuyerSearch580){MMABuyerSearch580.norm=text;MMABuyerSearch580.matches=matches}
const priorFilter=partyFiltered;
partyFiltered=function(kind){
 if(kind!=='supplier')return priorFilter.apply(this,arguments);
 const field=q('ssearch'),query=field.value;
 let rows;
 try{field.value='';rows=priorFilter.apply(this,arguments)}finally{field.value=query}
 return rows.filter(row=>MMAPartySearch630.matches([row.company_name,row.supplier_code,row.supplier_group,row.city,row.owner_name,row.owner_mobile,row.gst_no,row.pan_no].join(' '),query));
};
// Search inputs inside a dropdown must not submit the surrounding party form.
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('input[type="search"]')&&event.target.closest('#bf,#sf')&&event.target.closest('.picker427,.buyerItems523,.supplierItems520'))event.preventDefault()},true);
// A complete new master snapshot updates pickers without replacing form values or search terms.
const previous=refreshMasterControls;refreshMasterControls=function(...args){const result=previous.apply(this,args);window.MMABuyerMaster523?.refreshLists?.();window.MMASupplierMaster520?.refreshLists?.();window.MMADropdowns525?.sync();return result};
// Make a hidden existing/pending party discoverable independently of list filters.
const root=q('buyers');if(root){const box=document.createElement('details');box.className='existingBuyer581';box.innerHTML='<summary>Find existing buyer (all statuses)</summary><input type="search" aria-label="Find existing buyer" placeholder="Buyer name / GST / PAN / mobile"><div role="status"></div><div data-existing-buyers581></div>';root.querySelector('.filters')?.after(box);const search=box.querySelector('input'),status=box.querySelector('[role=status]'),list=box.querySelector('[data-existing-buyers581]');
 const label=row=>[row.company_name,row.city,row.gst_no,row.pan_no,row.owner_mobile,row.legal_name,row.trade_name].filter(Boolean).join(' ');
 function draw(){list.replaceChildren();const term=text(search.value);if(!term){status.textContent='Search registered name, GST, PAN or mobile. Buyer approval is required for entry selection.';return}const exact=B.filter(row=>matches(label(row),term));status.textContent=exact.length?exact.length+' buyer(s).':'No accessible buyer found. Refresh Buyer list; verify Normal/Grey segment and exact registered name.';for(const row of exact){const line=document.createElement('div');line.style.cssText='padding:8px;border-bottom:1px solid #ddd';const description=document.createElement('span');description.textContent=[row.company_name,row.city,row.status,'Approval: '+(row.approval_status||'Not approved'),row.gst_no?'GST: '+row.gst_no:'',row.pan_no?'PAN: '+row.pan_no:''].filter(Boolean).join(' · ');line.append(description);list.append(line)}}
 search.oninput=draw;box.addEventListener('toggle',()=>{if(box.open){draw();search.focus()}});window.addEventListener('erp372:buyers',()=>{if(box.open)draw()});window.addEventListener('erp374:buyer-deleted',()=>{if(box.open)draw()});
}
// Refresh names after returning from another tab, without reloading financial records.
let lastBuyerRead=0,lastSupplierRead=0,refreshing=null;
const buyerLoad=loadB;loadB=async function(...args){const before=B,result=await buyerLoad.apply(this,args);if(B!==before)lastBuyerRead=Date.now();return result};
const supplierLoad=loadS;loadS=async function(...args){const before=S,result=await supplierLoad.apply(this,args);if(S!==before)lastSupplierRead=Date.now();return result};
const formOptions={saleForm:['saleOptions',['salebuyer','salesupplier']],orderForm:['orderOptions',['obuyer','osupplier']],paymentForm:['paymentOptions',['paymentBuyer','paymentSupplier']],ledgerForm:['ledgerOptions',['ledgerBuyer','ledgerSupplier']]};
const visibleLists=new Set(['buyers','suppliers']);
async function refreshParties(){
 if(refreshing||document.hidden||q('app')?.classList.contains('hide'))return refreshing;
 const page=CURRENT_PAGE, config=formOptions[page], now=Date.now();
 const refreshBuyer=(config||page==='buyers'||page==='buyerForm')&&now-lastBuyerRead>=60000;
 const refreshSupplier=(config||page==='suppliers'||page==='supplierForm')&&now-lastSupplierRead>=60000;
 if(!refreshBuyer&&!refreshSupplier)return;
 const beforeB=B,beforeS=S;
 refreshing=(async()=>{
  await Promise.all([refreshBuyer&&loadB(),refreshSupplier&&loadS()]);
  if(!config||CURRENT_PAGE!==page||(B===beforeB&&S===beforeS))return;
  const values=new Map(config[1].map(id=>[id,q(id)?.value]));
  window[config[0]]();
  for(const [id,value] of values){
   const field=q(id);
   if(field&&value&&[...field.options].some(o=>o.value===value&&!o.disabled))field.value=value;
  }
 })();
 try{await refreshing}finally{refreshing=null}
}
const refresh=()=>void refreshParties().catch(console.error);
const priorOpen=openPage;
openPage=function(id,...args){
 const result=priorOpen.call(this,id,...args);
 if(CURRENT_PAGE===id&&visibleLists.has(id))refresh();
 return result;
};
window.addEventListener('focus',refresh);
document.addEventListener('visibilitychange',refresh);
document.addEventListener('pointerdown',event=>{
 if(event.target.closest('.v106Picker,.v115Combo,.existingBuyer581'))refresh();
},true);
setInterval(()=>{if(visibleLists.has(CURRENT_PAGE))refresh()},60000);
let actor;sb.auth.onAuthStateChange((event,session)=>{const next=session?.user?.id||null;if(event==='SIGNED_OUT'||actor!==undefined&&actor!==next){MMALists581.reset();lastBuyerRead=0;lastSupplierRead=0}actor=next});
})();
