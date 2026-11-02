/* V583: existing Team Role controls own their Buyer/Supplier detail subpages. */
(()=>{'use strict';
 const detail=window.openMasterDetail,ledger=window.openPartyLedger;
 function parent(kind){
  const key=kind==='buyer'?'buyers':'suppliers';
  v92Parent.partyDetail=key;v92Parent.partyLedger=key;
  v101FormParent.partyDetail=key;v101FormParent.partyLedger=key;
  v39ModuleForPage.partyDetail=key==='buyers'?'Buyer':'Supplier';
  v39ModuleForPage.partyLedger=v39ModuleForPage.partyDetail;
 }
 window.openMasterDetail=function(kind,...args){parent(kind);return detail.call(this,kind,...args)};
 window.openPartyLedger=function(kind,...args){parent(kind);return ledger.call(this,kind,...args)};
})();
