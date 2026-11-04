const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync('www/ceo-dashboard-v550.js','utf8');
const load=s.slice(s.indexOf(' async function load(){'),s.indexOf(' const reportIcons506='));
const summary=s.slice(s.indexOf(' async function orderSummary618('),s.indexOf(' async function graphMasterAPI619('));
(async()=>{
 let financeCalls=0,rendered=0,requested;
 const finance={entries620:{sale:{amount:8158225,count:102},payment:{amount:24761234,count:252},ledger:{amount:11717330,count:156}},total620:{amount:33419459,count:354},totals:{sales:8158225,receipt:24761234,opening:0},monthly:[{month:'2026-11',sales:8158225,receipt:24761234}]};
 const status={},c={window:null,AbortController,setTimeout,clearTimeout,Promise,Error,actor:'owner',sessionKey:'session',localStorage:{getItem:()=> 'token'},controls:new Set,monthOrderFrom619:'',monthOrderTo619:'',today:()=> '2026-11-04',company:'',category:'',view:'overview',detail:null,revision:0,data:{},orderHeaderData:{old:true},active:false,catalog:{},catalogError:'',period:'fy',entryRangeMode652:true,year:2026,comparisonOn:false,ERPEmployeeAuth:{employee:{id:'owner'}},context:()=>true,can:()=>true,viewKey:()=> 'sale',shell(){},page:{hidden:false,querySelector:()=>status},overviewRange652:()=>({from:'2026-11-02',to:'2026-11-03'}),range:()=>({from:'2026-04-01',to:'2026-11-04'}),api:async action=>{assert.notEqual(action,'finance');return action==='orders'?{total:7}:{}},graphFinance646:async(fin,args)=>{financeCalls++;requested=args;return finance},render(){if(c.orderHeaderData?.finance652){assert.equal(c.orderHeaderData.finance652,c.data.finance.value);assert.equal(c.orderHeaderData.entries620.sale.amount,c.data.finance.value.totals.sales);assert.equal(c.orderHeaderData.entries620.payment.amount,c.data.finance.value.totals.receipt);rendered++;}},out(){}};
 c.window=c;vm.createContext(c);vm.runInContext(summary+load,c);await c.load();
 assert.equal(financeCalls,1);assert.equal(requested.from,'2026-11-02');assert.equal(requested.to,'2026-11-03');assert(rendered>0);assert.equal(c.orderHeaderData.total620.count,354);
 const header=s.slice(s.indexOf(' function orderHeader(){'),s.indexOf('\n',s.indexOf(' function orderHeader(){')));
 const box={hidden:false};Object.assign(c,{allowed:()=>true,document:{getElementById:()=>box},money:String,num:String,date:String,esc:String});
 vm.runInContext(header,c);c.orderHeader();const section=box.innerHTML.split('class="entrySummary618"')[1].split('</div>')[0];
 assert.equal((section.match(/<span /g)||[]).length,2);assert(section.includes('>Sale<b>'));assert(section.includes('>Receiving<b>'));assert(!section.includes('Ledger (All)'));
 console.log('PASS one selected date range and one finance response feed all three top cards, both lower totals and the graph; header contains only Total Entry, Sale and Receiving.');
})().catch(e=>{console.error(e);process.exitCode=1});
