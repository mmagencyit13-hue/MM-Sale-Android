const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('www/ceo-dashboard-v550.js','utf8');
const fragment=src.slice(src.indexOf(' async function orderSummary618('),src.indexOf(' async function graphMasterAPI619('));
(async()=>{
 let call;
 const summary={entries620:{sale:{amount:8158225,count:102},payment:{amount:24761234,count:252},ledger:{amount:11717330,count:156}},total620:{amount:33419459,count:354}};
 const c={AbortController,setTimeout,clearTimeout,Promise,actor:'owner',sessionKey:'session',localStorage:{getItem:()=> 'token'},controls:new Set,monthOrderFrom619:'',monthOrderTo619:'',today:()=> '2026-11-04',company:'',category:'',api:async()=>({total:7}),graphFinance646:async(fin,args)=>{call=args;return summary}};
 vm.createContext(c);vm.runInContext(fragment,c);
 const r=await c.orderSummary618({from:'2026-11-01',to:'2026-11-03'});
 assert.equal(r.entries620.sale.count,102);assert.equal(r.entries620.payment.amount,24761234);assert.equal(r.total620.count,354);assert.equal(r.total620.amount,33419459);assert.equal(call.from,'2026-11-01');assert.equal(call.to,'2026-11-03');assert.equal(call.comparison,false);assert.equal(c.controls.size,0);
 console.log('PASS entry header uses the same combined graph source; raw grand total is not recomputed from overlapping displayed columns.');
})().catch(e=>{console.error(e);process.exitCode=1});
