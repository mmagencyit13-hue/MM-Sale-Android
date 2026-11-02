(()=>{"use strict";
 const q=id=>document.getElementById(id);
 let profilesPending=null,mappingPending=null;
 function selected(){return q("dashboardCompany493")?.value||""}
 function name(supplier){return v39Profiles.find(p=>String(p.id)===String(supplier?.print_company_id||""))?.company_name||""}
 window.MMACompany493={selected,name};
 const supplierLabel=document.createElement("label");
 supplierLabel.innerHTML='Company Name<select id="sPrintCompany493"><option value="">Select Company</option></select>';
 q("scompany").closest("label").firstChild.textContent="Firm Name *";
 const executiveLabel=q("sexec").closest("label");
 const companyRow=document.createElement("div");companyRow.id="supplierCompanyRow494";
 companyRow.style.cssText="grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start";
 executiveLabel.before(companyRow);companyRow.append(executiveLabel,supplierLabel);
 const dashboardLabel=document.createElement("label");
 dashboardLabel.innerHTML='Company<select id="dashboardCompany493"><option value="">All Companies</option></select>';
 q("d397Category").closest("label").after(dashboardLabel);
 function fillCompanies(){
  for(const [id,placeholder] of [["sPrintCompany493","Select Company"],["dashboardCompany493","All Companies"]]){
   const el=q(id),value=el.value;
   el.replaceChildren(new Option(placeholder,""),...v39Profiles.map(p=>new Option(p.company_name,p.id)));
   el.value=[...el.options].some(o=>o.value===value)?value:"";
   el.dispatchEvent(new Event("change",{bubbles:true}));
  }
 }
 async function profiles(){
  if(profilesPending)return profilesPending;
  profilesPending=v39LoadProfiles();
  try{return await profilesPending}finally{profilesPending=null}
 }
 const oldProfiles=v39LoadProfiles;
 v39LoadProfiles=async function(...args){const r=await oldProfiles.apply(this,args);fillCompanies();decorate();return r};
 async function mappings(){
  if(mappingPending)return mappingPending;
  mappingPending=(async()=>{
   const rows=await fetchAll(()=>sb.from("suppliers").select("id,print_company_id").order("id"));
   const byId=new Map(rows.map(p=>[String(p.id),p.print_company_id]));
   for(const supplier of S)if(byId.has(String(supplier.id)))supplier.print_company_id=byId.get(String(supplier.id));
  })();
  try{return await mappingPending}finally{mappingPending=null}
 }
 function decorate(){
  for(const tr of q("srows").querySelectorAll("tr")){
   const id=tr.dataset.partyId||tr.querySelector("[data-party-view-id]")?.dataset.partyViewId;
   const supplier=S.find(p=>String(p.id)===String(id));
   const cell=tr.querySelector('button[onclick^="openMasterDetail"]')?.closest("td")||tr.cells[0];
   if(!supplier||!cell)continue;
   let el=tr.querySelector(".supplierCompany493");
   if(!el){el=document.createElement("small");el.className="supplierCompany493";el.style.cssText="display:block;color:#536782;margin-top:4px";cell.append(el)}
   el.textContent=name(supplier);el.hidden=!el.textContent;
  }
 }
 const previousRender=renderS;
 renderS=function(...args){const r=previousRender.apply(this,args);decorate();return r};
 const oldEdit=window.editS;
 window.editS=async function(...args){try{await profiles();return await oldEdit.apply(this,args)}catch(e){alert("Company list could not load: "+e.message)}};
 const add=q("addSupplier"),oldAdd=add.onclick;
 add.onclick=async function(e){try{await profiles();const r=await oldAdd.call(this,e);q("sPrintCompany493").value="";q("sPrintCompany493").dispatchEvent(new Event("change",{bubbles:true}));return r}catch(err){alert("Company list could not load: "+err.message)}};
 const editForm=q("sf"),submit=editForm.onsubmit;
 editForm.onsubmit=async function(e){await submit.call(this,e);if(!q("supplierForm").classList.contains("hide"))return;window.MMADashboard400?.invalidate();decorate()};
 // Data-entry screens remain unchanged; company is resolved only for exports.
 const exportRows=csvExport;
 csvExport=function(filename,rows,...args){
  const result=rows.map(row=>{
   if(!Object.prototype.hasOwnProperty.call(row,"_Supplier_ID493"))return row;
   const {_Supplier_ID493:id,...values}=row;
   return {...values,"Company Name":name(S.find(p=>String(p.id)===String(id)))};
  });
  return exportRows.call(this,filename,result,...args);
 };
 for(const id of ["exportSuppliers","exportSales","exportPayments","exportLedger","ledgerExport"]){
  const el=q(id);if(!el?.onclick)continue;const prior=el.onclick;
  el.onclick=async function(e){if(this.disabled)return;this.disabled=true;try{await Promise.all([profiles(),mappings()]);return await prior.call(this,e)}catch(err){alert("Export could not load Company Name: "+err.message)}finally{this.disabled=false}};
 }
 let loadingCompanies=false;
 const open=openPage;
 openPage=function(id,...args){
  if(id!=="commissionFollowUp"&&window.MMAFollow493?.isK())window.MMAFollow493.reset();
  const result=open.call(this,id,...args);
  if((id==="dashboard"||id==="suppliers")&&!loadingCompanies){
   loadingCompanies=true;
   void profiles().then(()=>{if(id==="suppliers")decorate()}).catch(e=>{if(id==="dashboard")q("d397Status").textContent="Company list could not load: "+e.message}).finally(()=>loadingCompanies=false);
  }
  return result;
 };
 let dashboardChoice="";
 q("dashboardCompany493").addEventListener("change",()=>{
  const value=selected();if(value===dashboardChoice)return;dashboardChoice=value;
  if(CURRENT_PAGE==="dashboard")void loadDashboard(true);
 });
 // Sync the searchable select after programmatic fills, including async edits.
 const fillOriginal=fill;
 fill=function(map,record){const r=fillOriginal(map,record);if(map===SM)q("sPrintCompany493").dispatchEvent(new Event("change",{bubbles:true}));return r};
 window.MMASearch427?.mount(q("sPrintCompany493"),"Company");
 const clear=document.createElement("button");clear.type="button";clear.className="light";clear.textContent="Clear Company";clear.style.cssText="font-size:11px;padding:4px 8px;align-self:flex-start";
 clear.onclick=()=>{q("sPrintCompany493").value="";q("sPrintCompany493").dispatchEvent(new Event("change",{bubbles:true}))};supplierLabel.append(clear);
 // Dashboard select remains native so All Companies can be selected explicitly.
 if(CURRENT_PAGE==="dashboard"||CURRENT_PAGE==="suppliers")void profiles().catch(()=>{});
})();
