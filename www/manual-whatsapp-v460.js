(() => {
 'use strict';
 let state=null,generation=0;
 const root=()=>document.getElementById('manualWhatsApp460'),button=()=>document.getElementById('submitOrder');
 const message=t=>{document.getElementById('submitMessage').textContent=t};
 function phone(raw){let v=String(raw||'').split(/[,;/]/)[0].trim().replace(/\.0$/,'').replace(/\D/g,'');if(v.length===10)v='91'+v;if(v.startsWith('00'))v=v.slice(2);if(v.length<10||v.length>15)throw Error('Correct the mobile number in the master first.');return v}
function pdfMessage647(order,executive){const clean=v=>String(v??"-").replace(/[\r\n]+/g," ").trim()||"-";const units=new Map;for(const line of order.order_items||[]){const unit=clean(line.unit||""),qty=Number(String(line.quantity??0).replace(/,/g,""));if(!Number.isFinite(qty))throw Error("Order quantity is invalid. Review the order before sharing.");units.set(unit,(units.get(unit)||0)+qty)}const qty=units.size?[...units].map(([u,n])=>n.toLocaleString("en-IN",{maximumFractionDigits:3})+(u!=="-"?" "+u:"")).join(" + "):"-";const d=String(order.order_date||"").slice(0,10);return "Order form\nSupplier Name- "+clean(order.supplier_name)+"\nBuyer Name- "+clean(order.buyer_name)+"\nQty- "+qty+"\nDated- "+(/^\d{4}-\d{2}-\d{2}$/.test(d)?d.split("-").reverse().join("-"):clean(d))+"\nExecutive name- "+clean(executive)} const done=x=>['image_link_opened_unverified','not_on_whatsapp'].includes(x.status);
 const current=()=>!!state&&state.actor===ERPEmployeeAuth.employee?.id;
 function ready(){return current()&&!!state.file&&['buyer','supplier'].every(k=>done(state.steps[k]))}
 function declarations(){if(!ready())throw Error('Complete both WhatsApp steps first');return Object.fromEntries(['buyer','supplier'].map(k=>[k,{number:state.recipients[k],status:state.steps[k].status,chat_opened:state.steps[k].chat_opened,share_completed:false,delivery_verified:false}]))}
 function render(){
  if(!root()||!current())return;
  root().innerHTML='<h3>Share Order PDF & Details</h3><p class="manualWaNote460">पहले PDF भेजकर वापस आएँ। फिर Send Order Details से तैयार message भेजें। WhatsApp में दोनों बार Send आप दबाएँ। Delivery verified नहीं है।</p>'+['buyer','supplier'].map(k=>{
   const x=state.steps[k],complete=done(x),locked=k==='supplier'&&!done(state.steps.buyer);
   return '<article class="manualWaRecipient460 '+(complete?'complete':'')+'"><header><span class="waAvatar461">'+(k==='buyer'?'♙':'▣')+'</span><div><small>'+(k==='buyer'?'Buyer':'Supplier')+'</small><b>'+safeHTML(state.names[k])+'</b></div><strong class="waTick461">'+(complete?x.status==='not_on_whatsapp'?'×':'✓':'')+'</strong></header>'+
    (complete?'<p>'+(x.status==='not_on_whatsapp'?'No WhatsApp · marked by you':'PDF & details opened · sending unverified')+'</p>':locked?'<p>पहले Buyer step पूरा करें</p>':'<div class="manualWaActions460"><button type="button" data-wa-link="'+k+'">'+(x.pdf_returned?'Share PDF again':'1. Share PDF')+'</button>'+(x.pdf_returned?'<button type="button" data-wa-details="'+k+'">2. Send Order Details</button>':'')+(state.pending===k?'<button type="button" data-wa-return="'+k+'">✓ वापस आ गए · आगे बढ़ें</button>':'')+(x.pdf_opened?'<button type="button" data-wa-missing="'+k+'">No WhatsApp account</button>':'')+'</div>')+'</article>';
  }).join('');
  button().disabled=!ready();button().textContent='Submit Order';
 }
 function complete(k){
  if(!current()||state.pending!==k)return;
  const x=state.steps[k],phase=state.pendingPhase;
  state.pending='';state.pendingPhase='';state.left=false;
  if(phase==='pdf'){x.pdf_returned=true;render();message('अब '+(k==='buyer'?'Buyer':'Supplier')+' के लिए Send Order Details दबाएँ और तैयार message भेजें।');return;}
  if(phase!=='details'||!x.chat_opened)return;
  x.status='image_link_opened_unverified';render();if(ready())state.onready?.();else message('अब Supplier को PDF और Order Details भेजें।');
 }
 function returned(){if(current()&&state.pending&&state.left)complete(state.pending)}
 async function begin(options){
  const seq=++generation;state={...options,steps:{buyer:{pdf_opened:false,pdf_returned:false,chat_opened:false,status:''},supplier:{pdf_opened:false,pdf_returned:false,chat_opened:false,status:''}},pending:'',pendingPhase:'',left:false};
  button().disabled=true;message('Preparing order PDF…');
  const data=await ERPEmployeeAuth.app('pair-terms',{manual_prepare:true,request_id:options.request_id,payload:options.payload});
  if(seq!==generation||!current())return;
  state.recipients=data.recipients;phone(data.recipients.buyer);phone(data.recipients.supplier);
  state.names={buyer:data.pdf_order.buyer_name,supplier:data.pdf_order.supplier_name};state.ref=data.pdf_order.ref_id;
  state.executive=ERPEmployeeAuth.employee?.name||options.executive||data.pdf_order.app_pdf_context?.name||'';
  state.shareText647=pdfMessage647(data.pdf_order,state.executive);
  const file=await MMOrderPDF.create({...data.pdf_order,app_images:(options.images||[]).filter(x=>x.mime?.startsWith('image/')||x.thumbnail).map(x=>({url:x.url}))});
  if(seq!==generation||!current())return;
  state.file=file;
  await window.MMAOrderImage468.publish(file,options.request_id,()=>seq===generation&&current(),message);
  if(seq!==generation||!current())return;
  await window.MMAPdfUpload462.upload(file,options.request_id,()=>seq===generation&&current(),(n,t)=>message('Saving permanent PDF… '+Math.round(n/t*100)+'%'));
  if(seq!==generation||!current())return;
  render();message('Order '+state.ref+' · PDF and order message ready.');
 }
 let opening=false;
 async function handle(event){
  const target=event.target.closest('[data-wa-link],[data-wa-details],[data-wa-return],[data-wa-missing]');
  if(!target||!current()||!state.file||opening)return;
  const k=target.dataset.waLink||target.dataset.waDetails||target.dataset.waReturn||target.dataset.waMissing,x=state.steps[k];
  if(!x||k==='supplier'&&!done(state.steps.buyer))return;
  if(target.dataset.waMissing){if(!x.pdf_opened)return;x.status='not_on_whatsapp';state.pending='';state.left=false;render();if(ready())state.onready?.();return;}
  if(done(x))return;
  if(target.dataset.waReturn){complete(k);return;}
  const actor=state.actor,seq=generation;
  opening=true;
  try{
   if(target.dataset.waDetails){
    if(!x.pdf_returned)return;
    const url='https://wa.me/'+phone(state.recipients[k])+'?text='+encodeURIComponent(state.shareText647);
    if(window.MMADocuments629)await window.MMADocuments629.openWhatsApp(url);
    else {const opened=window.open(url,'_blank');if(!opened)throw Error('Allow pop-ups, then retry.');try{opened.opener=null}catch{}}
    if(seq!==generation||!current()||state.actor!==actor)return;
    x.chat_opened=true;state.pendingPhase='details';
   }else{
    if(window.MMADocuments629?.shareWhatsApp)await window.MMADocuments629.shareWhatsApp(state.file,state.file.name||('MMA_Order_'+state.ref+'.pdf'),phone(state.recipients[k]),'');
    else if(navigator.canShare?.({files:[state.file]})&&navigator.share)await navigator.share({files:[state.file],title:'Order '+state.ref});
    else throw Error('Direct PDF sharing needs the MMA Tradelink Android app or a browser with file sharing.');
    if(seq!==generation||!current()||state.actor!==actor)return;
    x.pdf_opened=true;state.pendingPhase='pdf';
   }
   state.pending=k;state.left=false;render();
  }finally{opening=false;}
 }
 document.addEventListener('click',e=>{if(e.target.closest('#manualWhatsApp460'))void handle(e).catch(error=>message(error.message))});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(current()&&state.pending)state.left=true}else returned()});
 window.addEventListener('blur',()=>{if(current()&&state.pending)state.left=true});window.addEventListener('focus',returned);
 sb.auth.onAuthStateChange(()=>{generation++;state=null;root()?.replaceChildren()});
 window.MMAManualWA460={begin,ready,declarations,phone,reset(){generation++;state=null;root()?.replaceChildren()},focus(){root()?.scrollIntoView({behavior:'smooth',block:'start'})},get requestId(){return state?.request_id||''},get file(){return current()?state.file:null}};
})();
