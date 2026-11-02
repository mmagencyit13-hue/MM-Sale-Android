(()=>{"use strict";let pending=null,last=0;const q=id=>document.getElementById(id);
async function agents(force=false){if(pending)return pending;if(!force&&Date.now()-last<30000)return;
 pending=(async()=>{const rows=await fetchAll(()=>sb.from("master_sub_agents").select("*").order("name").order("id"));const value=q("bagent")?.value||"";MASTER=[...MASTER.filter(r=>r.category!=="SUB_AGENT"),...rows.map(r=>({...r,category:"SUB_AGENT"}))];refreshMasterControls();const el=q("bagent");if(el&&value){el.value=value;el.dispatchEvent(new Event("change",{bubbles:true}))}last=Date.now()})();
 try{return await pending}finally{pending=null}
}
const add=q("addBuyer"),beforeAdd=add.onclick;add.onclick=async function(e){try{await agents(true);return await beforeAdd.call(this,e)}catch(err){alert("Sub Agent list load failed: "+err.message)}};
const beforeEdit=window.editB;window.editB=async function(...args){await agents(true);return await beforeEdit.apply(this,args)};
})();
