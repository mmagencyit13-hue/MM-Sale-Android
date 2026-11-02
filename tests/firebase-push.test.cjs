const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('www/firebase-push-v613.js','utf8'),tick=()=>new Promise(r=>setImmediate(r));
async function env(options={}){
 const ev={},calls=[],received=[],opened=[],timers=new Map(),intervals=[],store=new Map([['mma_sales_employee_session_v1','a'.repeat(64)]]);let id=0,auth;
 const el=Object.fromEntries(['[data-register]','[data-test]','textarea','small'].map(k=>[k,{}]));
 const push={addListener:(k,f)=>{ev[k]=f;return{remove(){}}},checkPermissions:async()=>({receive:options.denied?'denied':'granted'}),requestPermissions:async()=>({receive:'denied'}),createChannel:async()=>{},register:async()=>options.error?ev.registrationError({error:'config failed'}):ev.registration({value:'test-token-613'})};
 const c={console,Date,Error,Promise,String,Set,crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},setTimeout:f=>{timers.set(++id,f);return id},clearTimeout:k=>timers.delete(k),setInterval:f=>intervals.push(f),ERPEmployeeAuth:{employee:{id:'alice'}},sb:{auth:{onAuthStateChange:f=>auth=f}},MMA_CONFIG:{employeeGateway:'https://example.test/functions/v1/employee-gateway',publicKey:'public'},fetch:async(u,o)=>{calls.push({...JSON.parse(o.body),session:o.headers['x-erp-session']});return{ok:!options.backendFail,json:async()=>options.backendFail?{error:'backend failed'}:{ok:true,job_id:1}}},document:{createElement:()=>({querySelector:k=>el[k]}),getElementById:()=>({before(){}})},Capacitor:{isNativePlatform:()=>!options.web,isPluginAvailable:()=>true,Plugins:{PushNotifications:push}},MMANativeNotifications608:{enable:async()=>true,receiveRemote:async d=>{received.push(d);return true},openRemote:d=>opened.push(d)}};
 if(options.registerPlugin)c.Capacitor.registerPlugin=()=>push;
 c.window=c;vm.createContext(c);vm.runInContext(source,c);await tick();return{c,ev,calls,received,opened,timers,store,el,auth:()=>auth};
}
(async()=>{
 let n=0;const pass=s=>console.log('PASS '+(++n)+' '+s);
 let e=await env({web:true});assert(!e.c.MMAFirebase613);pass('PWA unchanged');
 e=await env();await e.c.MMAFirebase613.enable();assert(e.c.MMAFirebase613.serverBound);assert.equal(e.calls[0].op,'register');assert.equal(e.timers.size,0);pass('sync listener bridge and token event bind authenticated device');
 await e.el['[data-test]'].onclick();assert(e.calls.some(x=>x.op==='test'));pass('test button uses backend Firebase queue');
 assert.equal((source.match(/<button /g)||[]).length,2);pass('two visible buttons');
 await e.ev.pushNotificationReceived({id:'one',data:{type:'chat'}});await e.ev.pushNotificationReceived({id:'one',data:{type:'chat'}});assert.equal(e.received.length,1);pass('remote duplicate suppressed');
 e.ev.pushNotificationActionPerformed({notification:{data:{recipient_id:'alice',room_id:'r'}}});assert.equal(e.opened[0].room_id,'r');pass('tap uses auth-safe router');
 e.store.delete('mma_sales_employee_session_v1');e.c.ERPEmployeeAuth.employee=null;e.auth()('SIGNED_OUT');assert(!e.c.MMAFirebase613.serverBound);assert(e.c.MMAFirebase613.ownsEvents);assert(!e.calls.some(x=>x.op==='unregister'));pass('logout retains generic alert association without credentials');
 await e.ev.pushNotificationReceived({id:'two',data:{type:'chat'}});assert.equal(e.received.length,2);pass('logged-out foreground push displays');
 e.store.set('mma_sales_employee_session_v1','b'.repeat(64));e.c.ERPEmployeeAuth.employee={id:'bob'};e.auth()('SIGNED_IN');await tick();assert.equal(e.calls.at(-1).session,'b'.repeat(64));pass('account switch rebinds');
 e.ev.registration({value:'rotated-token'});await tick();assert.equal(e.calls.at(-1).token,'rotated-token');pass('token rotation rebinds');
 e=await env({backendFail:true});await assert.rejects(e.c.MMAFirebase613.enable(),/backend failed/);assert(!e.c.MMAFirebase613.serverBound);pass('backend failure does not claim connection');
 e=await env({denied:true});await assert.rejects(e.c.MMAFirebase613.enable(),/Allow notifications/);assert.equal(e.calls.length,0);pass('denied permission blocks registration');
 e=await env({error:true});await assert.rejects(e.c.MMAFirebase613.enable(),/config failed/);assert.equal(e.timers.size,0);pass('error clears timer');
 e=await env({registerPlugin:true});await e.c.MMAFirebase613.enable();assert(e.c.MMAFirebase613.serverBound);pass('registerPlugin bridge supported');
 const {messageFor,firebaseFailure}=await import('../backend/push-core.mjs');
 const job={id:42,token:'device',data:{type:'chat',recipient_id:'alice'},expires_at:new Date(Date.now()+60000).toISOString()};
 const m=messageFor(job);assert(m.message.notification);assert.equal(m.message.android.priority,'HIGH');assert.equal(m.message.android.notification.channel_id,'mma_messages_tasks_v608');pass('background notification payload and native channel');
 assert.equal(m.message.android.notification.tag,'mma613-42');pass('stable retry notification tag');
 assert.equal(messageFor({...job,expires_at:'2000-01-01'}),null);pass('expired payload suppressed');
 assert(!firebaseFailure(400,{error:{details:[{errorCode:'INVALID_ARGUMENT'}]}}).dead);assert(firebaseFailure(404,{error:{details:[{errorCode:'UNREGISTERED'}]}}).dead);pass('only confirmed unregistered tokens disabled');
 console.log(n+' Firebase scenarios passed; physical phone test pending.');
})().catch(e=>{console.error(e);process.exitCode=1});
