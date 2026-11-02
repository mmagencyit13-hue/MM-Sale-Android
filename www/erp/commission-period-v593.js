(()=>{"use strict";const q=id=>document.getElementById(id);
for(const [rootId,prefix]of [["supplierCommissionForm",""],["buyerCommissionForm364","bc364"]]){
 const root=q(rootId),form=q(prefix+"supplierCommissionFormEl"),punch=q(prefix+"scPunchDate"),button=q(prefix+"loadCommissionData");if(!root||!form||!button)continue;
 const label=punch.closest("label");label.hidden=true;label.style.setProperty("display","none","important");label.querySelectorAll("input").forEach(x=>{x.required=false;x.setCustomValidity("")});
 button.hidden=false;button.style.removeProperty("display");
 function sync(){const from=q(prefix+"scFrom"),to=q(prefix+"scTo"),fy=fyRange();punch.value=from.value&&to.value&&from.value<=to.value&&from.value>=fy.from&&to.value<=fy.to?to.value:"";return !!punch.value}
 const save=form.onsubmit;let checking=false;
 form.onsubmit=async function(e){e.preventDefault();if(checking)return;checking=true;
  const kind=prefix?"buyer":"supplier",party=q(prefix+"scSupplier"),modeName=prefix?"bc364scMode":"scMode";
  const key=()=>JSON.stringify([currentFY(),party.value,q(prefix+"scFrom").value,q(prefix+"scTo").value,root.querySelector('input[name="'+modeName+'"]:checked')?.value]);const snapshot=key();
  try{const r=await sb.from(kind+"_commissions").select("id,bill_no").eq(kind+"_id",party.value).eq("calc_type",root.querySelector('input[name="'+modeName+'"]:checked').value).eq("from_date",q(prefix+"scFrom").value).eq("to_date",q(prefix+"scTo").value).limit(1);if(r.error)throw r.error;if(r.data?.length){q(prefix+"scMsg").textContent="Is party, mode aur period ka commission bill already bana hua hai. Existing bill edit karein ya period badlein.";return}if(snapshot!==key()||!sync())return;return await save.call(this,e)}catch(err){q(prefix+"scMsg").textContent=err.message}finally{checking=false}
 };
 const load=button.onclick;button.onclick=async function(e){if(!sync()){q(prefix+"scMsg").textContent="Selected financial year ke andar From/To dates select karein.";return}return await load.call(this,e)};
 document.addEventListener("submit",e=>{if(e.target===form&&!sync()){e.preventDefault();e.stopImmediatePropagation();q(prefix+"scMsg").textContent="Selected FY ke andar dates select karein."}},true);
}
})();
