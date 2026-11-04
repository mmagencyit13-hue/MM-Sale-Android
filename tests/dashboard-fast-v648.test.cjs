const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('www/ceo-dashboard-v550.js','utf8');
const fragment=source.slice(source.indexOf(' async function api('),source.indexOf(' async function reportAPI('));
(async()=>{
 let paths=[];
 const c={AbortController,setTimeout,clearTimeout,Set,Error,JSON,actor:'owner',view:'overview',company:'',category:'',comparisonOn:false,sessionKey:'session',controls:new Set,ERPEmployeeAuth:{employee:{id:'owner'}},allowed:()=>true,range:()=>({from:'2026-04-01',to:'2026-11-04'}),localStorage:{getItem:()=> 'a'.repeat(64)},MMA_CONFIG:{employeeGateway:'https://example.test/functions/v1/employee-gateway',publicKey:'public'},fetch:async(url,init)=>{paths.push(url);assert(url.endsWith('/rpc/mma646_dashboard_graph'));assert.equal(JSON.parse(init.body).p_args.from,'2026-04-01');return{ok:true,json:async()=>({build:646,actor:'owner',totals:{sales:102,receipt:182,opening:4},monthly:[],sources:{invoice:100,ledger_sale:2,payment:180,ledger_receipt:2}})}}};
 c.window=c;vm.createContext(c);vm.runInContext(fragment+';globalThis.call=()=>api("finance");',c);
 const result=await c.call();assert.equal(result.totals.receipt,182);assert.equal(result.totals.opening,4);assert.equal(paths.length,1);assert.equal(c.controls.size,0);
 console.log('PASS dashboard overview directly calls graph aggregation, skips old heavy finance query, and keeps totals/opening.');
})().catch(e=>{console.error(e);process.exitCode=1});
