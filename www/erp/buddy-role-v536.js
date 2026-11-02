(()=>{'use strict';
const previous=renderPerms,read=getPerms;
renderPerms=function(...args){
 const result=previous.apply(this,args),row=document.querySelector('[data-v92-page="buddyCommission533"]');
 if(row){
  row.cells[0].textContent='👁 Commission View / Download';
  const all=row.querySelector('[data-v92-all]'),show=row.querySelector('[data-v92-right="show"]'),download=row.querySelector('[data-v92-right="print"]');
  all.checked=!!(show?.checked&&download?.checked);
  all.title='Allow Commission in MM Buddy and signed bill downloads';
  all.setAttribute('aria-label','Allow Commission View and Download');
  for(const input of row.querySelectorAll('[data-v92-right]')){input.checked=all.checked;input.hidden=true;input.setAttribute('aria-hidden','true')}
 }
 return result;
};
getPerms=function(...args){
 const permissions=read.apply(this,args),all=document.querySelector('[data-v92-page="buddyCommission533"] [data-v92-all]');
 if(all&&permissions._pages){permissions._pages.buddyCommission533=Object.fromEntries(['show','save','update','search','delete','print'].map(action=>[action,all.checked]))}
 return permissions;
};
})();
