(()=>{"use strict";
 const q=id=>document.getElementById(id),root=q("supplierCommission");
 let kOnly=false,busy=false,editing=null;
 const state=id=>window.MMAFollow493.state(id);
 const ready=()=>window.MMAFollow493.ready();
 const matches=b=>ready()&&window.MMAK493.matches(state(b.id).tally,kOnly);
 const style=document.createElement("style");style.textContent='.tallyEditor495{min-width:150px}.tallyEditor495>div{display:flex;gap:5px;margin-top:5px}.tallyEditor495 button{font-size:11px;padding:4px 9px;min-height:0;margin:0}.tallyEditor495 [hidden]{display:none!important}.tallyEditor495 small{display:block;color:#b42318;max-width:220px;white-space:normal}.tallyEditor495 input[readonly]{background:#f0f4f8;color:#394b60}#commissionTallyDialog495{width:min(440px,94vw);border:1px solid #cbd7e4;border-radius:12px;padding:20px}#commissionTallyDialog495::backdrop{background:#17203377}#commissionTallyDialog495 label{display:flex;flex-direction:column;gap:6px;margin:16px 0}#commissionTallyDialog495 input{width:100%}#commissionTallyDialog495 .actions{display:flex;gap:8px;justify-content:flex-end}#commissionTallyDialog495 small{display:block;color:#b42318;white-space:normal}#makeMode495{color:#536782;font-size:12px;margin:10px 0}';document.head.append(style);
 const mode=document.createElement("p");mode.id="makeMode495";root.querySelector(".filters").after(mode);
 function decorate(){
  const head=q("scRows").closest("table").querySelector("thead tr");
  if(!head.querySelector("[data-tally-head495]")){const th=document.createElement("th");th.dataset.tallyHead495="";th.textContent="Tally Bill No.";head.lastElementChild.before(th)}
  for(const tr of q("scRows").rows){
   const action=tr.querySelector("[data-v49-delete]");
   if(!action){if(tr.cells.length===1)tr.cells[0].colSpan=head.cells.length;continue}
   const id=action.dataset.v49Delete;
   const cell=document.createElement("td");cell.textContent=state(id).tally||"";action.closest("td").before(cell);
   const edit=document.createElement("button");edit.type="button";edit.className="light";edit.dataset.tallyEdit495=id;edit.textContent="Edit Tally";edit.title="Edit Tally Bill No.";action.before(edit," ");
  }
  mode.textContent=ready()?(kOnly?"K entries · Esc returns to normal entries":"Normal entries · Press k / K to show K entries"):"Loading commission follow-up state…";
 }
 const render=renderSupplierCommissions;
 renderSupplierCommissions=function(...args){
  const original=SC;SC=original.filter(matches);
  try{const result=render.apply(this,args);decorate();return result}finally{SC=original}
 };
 const load=loadSupplierCommissions;
 loadSupplierCommissions=async function(...args){
  try{if(!root.classList.contains("hide"))await window.MMAFollow493.loadState()}catch(e){renderSupplierCommissions();mode.textContent="Tally state could not load: "+e.message;throw e}
  return load.apply(this,args);
 };
 function setMode(value){if(kOnly!==!!value)q("scSearch").value="";kOnly=!!value;window.MMACommissionEmployees495.close();renderSupplierCommissions()}
 const make=q("v287Make"),openMake=make.onclick;
 make.onclick=async function(...args){setMode(false);return openMake.apply(this,args)};
 new MutationObserver(()=>{if(root.classList.contains("hide")&&kOnly)setMode(false)}).observe(root,{attributes:true,attributeFilter:["class"]});
 const dialog=document.createElement("dialog");dialog.id="commissionTallyDialog495";
 dialog.innerHTML='<h3>Edit Tally Bill No.</h3><p data-bill495></p><label>Tally Bill No.<input data-value495 maxlength="200" autocomplete="off"></label><small data-message495></small><div class="actions"><button type="button" class="light" data-close495>Close</button><button type="button" data-submit495>Submit</button></div>';
 document.body.append(dialog);
 const close=()=>{if(!busy){dialog.close();editing=null}};
 dialog.querySelector("[data-close495]").onclick=close;
 dialog.addEventListener("cancel",e=>{if(busy)e.preventDefault();else editing=null});
 root.addEventListener("click",async e=>{
  const button=e.target.closest("[data-tally-edit495]");if(!button||busy)return;
  const bill=SC.find(b=>b.id===button.dataset.tallyEdit495);if(!bill)return;
  button.disabled=true;
  try{
   await window.MMAFollow493.loadState();
   if(!SC.some(b=>b.id===bill.id))throw Error("Bill no longer exists. Refresh first.");
   editing={id:bill.id,version:state(bill.id).id||""};
   dialog.querySelector("[data-bill495]").textContent=(bill.suppliers?.company_name||"")+" · "+bill.bill_no;
   dialog.querySelector("[data-value495]").value=state(bill.id).tally||"";
   dialog.querySelector("[data-message495]").textContent="";dialog.showModal();dialog.querySelector("[data-value495]").focus();
  }catch(error){alert(error.message)}finally{button.disabled=false}
 });
 dialog.querySelector("[data-submit495]").onclick=async function(){
  if(!editing||busy)return;busy=true;this.disabled=true;dialog.querySelector("[data-close495]").disabled=true;
  try{await window.MMAFollow493.saveTally(editing.id,dialog.querySelector("[data-value495]").value,editing.version);dialog.close();editing=null}
  catch(error){dialog.querySelector("[data-message495]").textContent=error.message}
  finally{busy=false;this.disabled=false;dialog.querySelector("[data-close495]").disabled=false}
 };
 document.addEventListener("keydown",e=>{
  if(root.classList.contains("hide"))return;
  if(e.key==="Escape"&&kOnly&&!busy){e.preventDefault();if(dialog.open)close();setMode(false);return}
  if(dialog.open)return;
  if(window.MMAK493.revealKey(e)){e.preventDefault();setMode(true)}
 },true);
 // Export the same mode, FY, supplier search and company filter as the list.
 q("exportCommission").onclick=async function(){
  if(this.disabled)return;this.disabled=true;
  try{await window.MMAFollow493.loadState();const query=q("scSearch").value.trim().toLowerCase(),company=q("commissionPrintCompany").value;
   const rows=SC.filter(b=>matches(b)&&v32InFY(b.punch_date||b.created_at)&&(!query||[b.bill_no,b.suppliers?.company_name].join(" ").toLowerCase().includes(query)));
   csvExport("MM_Agency_Commission_"+currentFY()+(kOnly?"_K":"")+".csv",rows.map(b=>({Company:v289BillCompany(b).name||"",Supplier:b.suppliers?.company_name,Bill:b.bill_no,Tally_Bill_No:state(b.id).tally||"",Commission:b.commission_amount,Final_Base:b.excluded_gst_amount,Punch_Date:b.punch_date})));
  }catch(e){alert("Commission export failed: "+e.message)}finally{this.disabled=false}
 };
 window.MMACommissionMake495={isK:()=>kOnly,reset:()=>setMode(false),matches};
 if(!root.classList.contains("hide"))void loadSupplierCommissions().catch(e=>mode.textContent=e.message);
})();
