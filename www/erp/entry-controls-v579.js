(()=>{'use strict';
 const mapping={saleForm:'saleform',paymentForm:'paymentFormEl',ledgerForm:'ledgerFormEl'};
 function clear(id){const page=document.getElementById(id);if(!page)return;for(const table of page.querySelectorAll('table')){const record=table._filter396Record;if(record){record.filters.clear();window.ERPTableFilters396?.apply(table,record)}}if(id==='sales')v30SalePage=0;if(id==='payments')paymentListPage=0;if(id==='ledger')ledgerListPage=0;}
 const previous=v88Refresh;v88Refresh=function(id=CURRENT_PAGE,...args){clear(id);return previous.call(this,id,...args)};
 document.addEventListener('keydown',event=>{
  if(!(event.ctrlKey||event.metaKey)||event.altKey||event.shiftKey||String(event.key).toLowerCase()!=='s')return;
  const form=document.getElementById(mapping[CURRENT_PAGE]);if(!form||form.closest('.hide')||form.hidden)return;
  event.preventDefault();if(event.repeat||document.querySelector('dialog[open]')||window.MMAEntrySave499?.isSaving(form)||form.getAttribute('aria-busy')==='true')return;
  const submit=form.querySelector('button[type="submit"]');if(submit?.disabled)return;
  if(submit)form.requestSubmit(submit);else form.requestSubmit();
 },true);
 window.MMAEntryControls579={clear};
})();
