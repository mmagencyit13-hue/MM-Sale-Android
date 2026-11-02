(()=>{"use strict";
 let rows=[],pending=null,loadedAt=0;
 const id=v=>String(v||"");
 function normalize(data){return data.filter(e=>!e.deleted_at&&!e.archived_at).map(e=>({id:id(e.employee_master_id||e.employee_id||e.id),team_id:id(e.team_id||e.team_member_id),name:String(e.employee_name||e.name||"").trim(),status:e.status||"Active",mobile:e.mobile||e.owner_mobile||""})).filter(e=>e.id&&e.name)}
 function all(){return rows.filter(e=>!/^inactive$/i.test(e.status)).slice().sort((a,b)=>a.name.localeCompare(b.name))}
 function name(value){if(!id(value))return "";const employee=rows.find(e=>e.id===id(value)||e.team_id===id(value));return employee?.name||(typeof T!=="undefined"?T.find(e=>id(e.id)===id(value))?.name:"")||""}
 function choices(saved){const result=all().map(e=>({id:e.id,name:e.name}));if(saved&&!result.some(e=>e.id===id(saved)))result.push({id:id(saved),name:name(saved)||"Previously assigned employee"});return result}
 async function load(force=false){
  if(!force&&loadedAt&&Date.now()-loadedAt<30000)return rows;
  if(pending)return pending;
  pending=(async()=>{
   let data;
   try{if(!window.MMAEmployeeRoster445?.read)throw Error("Employee roster unavailable");data=await window.MMAEmployeeRoster445.read()}
   catch(rosterError){const r=await sb.from("erp_employees").select("id,employee_name,mobile,status").is("deleted_at",null).order("employee_name");if(r.error)throw Error("Employee Master could not load: "+r.error.message);data=r.data||[]}
   if(!Array.isArray(data))throw Error("Employee Master returned an invalid list.");
   rows=normalize(data);loadedAt=Date.now();return rows;
  })();try{return await pending}finally{pending=null}
 }
 let menu=null,current=null;
 function close(){if(!menu)return;menu.remove();menu=null;current?.button.setAttribute("aria-expanded","false");current=null}
 function mount(select){
  if(!select||select.dataset.employeePicker495)return;select.dataset.employeePicker495="1";select.hidden=true;select.style.display="none";
  const button=document.createElement("button");button.type="button";button.className="employeePicker495";button.style.cssText="display:block;width:100%;min-width:170px;text-align:left;background:#fff;color:#172033;border:1px solid #bac8d8;padding:9px 10px;border-radius:7px;margin:0";select.after(button);
  function sync(){button.disabled=select.disabled;button.textContent=(select.value?(select.selectedOptions[0]?.textContent||"Select Employee"):"Select Employee")+" ▾";button.style.opacity=select.disabled?"0.65":"1";if(select.disabled&&current?.select===select)close()}
  button.onclick=()=>{
   if(select.disabled)return;if(current?.select===select){close();return}close();
   const rect=button.getBoundingClientRect();menu=document.createElement("div");menu.className="employeeMenu495";menu.style.cssText="position:fixed;z-index:15000;background:white;border:1px solid #bdcbd9;border-radius:8px;padding:8px;box-shadow:0 8px 25px #17203333;max-height:320px;overflow:auto";
   const width=Math.min(Math.max(rect.width,260),window.innerWidth-16);menu.style.width=width+"px";menu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-width-8))+"px";
   if(window.innerHeight-rect.bottom<200)menu.style.bottom=Math.max(8,window.innerHeight-rect.top)+"px";else menu.style.top=(rect.bottom+3)+"px";
   const input=document.createElement("input");input.type="search";input.placeholder="Search Employee";input.setAttribute("aria-label","Search Employee");input.style.cssText="width:100%;margin:0 0 7px;padding:8px";
   const list=document.createElement("div");list.setAttribute("role","listbox");menu.append(input,list);document.body.append(menu);current={select,button};button.setAttribute("aria-expanded","true");
   const render=()=>{list.replaceChildren();for(const option of [...select.options].filter(o=>o.value&&o.text.toLowerCase().includes(input.value.trim().toLowerCase()))){const item=document.createElement("button");item.type="button";item.textContent=option.text;item.style.cssText="display:block;text-align:left;width:100%;padding:9px;background:#fff;color:#172033;margin:0;border-radius:4px";item.setAttribute("role","option");item.setAttribute("aria-selected",String(option.selected));item.onclick=()=>{if(select.disabled)return;select.value=option.value;select.dispatchEvent(new Event("change",{bubbles:true}));sync();close();button.focus()};list.append(item)}if(!list.children.length)list.textContent="No employee found"};
   input.oninput=render;menu.onkeydown=e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();button.focus()}};render();input.focus();
  };
  select.addEventListener("change",sync);new MutationObserver(sync).observe(select,{attributes:true,attributeFilter:["disabled"],childList:true,subtree:true});sync();
 }
 document.addEventListener("pointerdown",e=>{if(menu&&!menu.contains(e.target)&&!current?.button.contains(e.target))close()});window.addEventListener("resize",close);document.addEventListener("scroll",e=>{if(menu&&!menu.contains(e.target))close()},true);
 window.MMACommissionEmployees495={load,choices,name,mount,close,normalize};
})();
