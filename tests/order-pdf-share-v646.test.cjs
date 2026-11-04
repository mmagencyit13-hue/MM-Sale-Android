const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('www/manual-whatsapp-v460.js','utf8');
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const events={},winEvents={},shares=[],el={manualWhatsApp460:{innerHTML:'',replaceChildren(){},scrollIntoView(){}},submitOrder:{},submitMessage:{}};
 const file=new Blob(['%PDF-1.7\n'],{type:'application/pdf'});file.name='Order_646.pdf';
 const c={window:null,document:{getElementById:id=>el[id],addEventListener:(k,f)=>events[k]=f},safeHTML:s=>s,navigator:{},ERPEmployeeAuth:{employee:{id:'owner',name:'Executive'},app:async()=>({recipients:{buyer:'9251629833',supplier:'919999999999'},pdf_order:{buyer_name:'Buyer',supplier_name:'Supplier',ref_id:'646',order_date:'2026-11-04',order_items:[{quantity:2,unit:'Pcs'},{quantity:3,unit:'Pcs'}]}})},MMOrderPDF:{create:async()=>file},MMAOrderImage468:{publish:async()=>({token:'private-token'})},MMAPdfUpload462:{upload:async()=>{}},sb:{auth:{onAuthStateChange(){}}},MMADocuments629:{shareWhatsApp:async(...args)=>shares.push(args)}};
 c.window=c;c.addEventListener=(k,f)=>winEvents[k]=f;vm.createContext(c);vm.runInContext(source,c);
 await c.MMAManualWA460.begin({actor:'owner',request_id:'request',payload:{},images:[]});
 assert.match(el.manualWhatsApp460.innerHTML,/Share PDF/);assert(!el.manualWhatsApp460.innerHTML.includes('Share Image Link'));
 function share(k){events.click({target:{closest:()=>({dataset:{waLink:k}})}});}
 share('buyer');await tick();assert.equal(shares.length,1);assert.equal(shares[0][0],file);assert.equal(shares[0][1],'Order_646.pdf');assert.equal(shares[0][2],'919251629833');assert.equal(shares[0][3],'Order form\nSupplier Name- Supplier\nBuyer Name- Buyer\nQty- 5 Pcs\nDated- 04-11-2026\nExecutive name- Executive');assert(!c.MMAManualWA460.ready());
 winEvents.blur();winEvents.focus();share('supplier');await tick();assert.equal(shares.length,2);winEvents.blur();winEvents.focus();assert(c.MMAManualWA460.ready());
 assert.equal(c.MMAManualWA460.declarations().buyer.delivery_verified,false);
 assert.equal(c.MMAManualWA460.declarations().supplier.share_completed,false);
 console.log('PASS direct PDF sharing: exact generated file, buyer/supplier sequence, no link text, return flow and unverified delivery retained.');
})().catch(e=>{console.error(e);process.exitCode=1});
