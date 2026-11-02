(()=>{"use strict";
 const running=new WeakMap();
 const messages={bf:"",sf:"",of:"omsg",saleform:"salemsg",paymentFormEl:"paymentMsg",ledgerFormEl:"ledgerMsg",supplierCommissionFormEl:"scMsg",bc364supplierCommissionFormEl:"bc364scMsg",tf:"tmsg",rf:"rmsg",masterFormEl:"masterMsg"};
 function message(form,error){
  let target=document.getElementById(messages[form.id]||"")||form.querySelector("[data-save-error499]");
  if(!target){target=document.createElement("p");target.dataset.saveError499="";target.setAttribute("role","status");target.style.color="#b42318";form.append(target)}
  target.textContent="Save could not complete: "+(error?.message||String(error))+". Please retry after correcting the issue.";
 }
 function install(form){
  if(!form||typeof form.onsubmit!=="function"||form.dataset.saveGuard499)return;
  const submit=form.onsubmit;form.dataset.saveGuard499="1";
  form.onsubmit=function(event){
   event?.preventDefault();
   if(running.has(form))return running.get(form);
   const priorBusy=form.getAttribute("aria-busy");form.setAttribute("aria-busy","true");
   const work=Promise.resolve().then(()=>submit.call(this,event)).catch(error=>message(form,error)).finally(()=>{running.delete(form);if(priorBusy===null)form.removeAttribute("aria-busy");else form.setAttribute("aria-busy",priorBusy)});
   running.set(form,work);return work;
  };
 }
 for(const id of ["bf","sf","of","saleform","paymentFormEl","ledgerFormEl","supplierCommissionFormEl","bc364supplierCommissionFormEl","printProfileForm","masterFormEl","tf","rf","userProfileForm"])install(document.getElementById(id));
 window.MMAEntrySave499={install,isSaving:form=>running.has(form)};
})();
