const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.join(__dirname,'../www');
const script=fs.readFileSync(path.join(root,'native-back-v609.js'),'utf8');
function env({native=true,employee={id:'alice'},saving=false,dialog=null,legacy=false}={}){
 let homes=0,backs=0,saveCalls=0;const label={textContent:''};
 const c={console,Event,setTimeout:f=>f(),document:{querySelectorAll:()=>dialog?[dialog]:[],getElementById:id=>id==='app'?{classList:{contains:()=>!employee}}:label},Capacitor:{isNativePlatform:()=>native,registerPlugin:()=>({minimizeApp:async()=>{homes++}})},ERPEmployeeAuth:{employee},MMASales:{isSaving:()=>saving},MMASaveScreen551:()=>saveCalls++,MMABack424:()=>backs++};
 if(legacy){const plug=c.Capacitor.registerPlugin();delete c.Capacitor.registerPlugin;c.Capacitor.Plugins={App:plug};}c.window=c;vm.createContext(c);vm.runInContext(script,c);return{c,homes:()=>homes,backs:()=>backs,saves:()=>saveCalls};
}
(async()=>{
 let count=0;const pass=s=>{count++;console.log('PASS '+s)};
 let e=env({employee:null});await e.c.MMANativeBack609.handle();assert.equal(e.homes(),1);assert.equal(e.backs(),0);pass('Back on logged-out/login screen returns to phone home');
 e=env({employee:null,legacy:true});await e.c.MMANativeBack609.handle();assert.equal(e.homes(),1);pass('native-injected App plugin works without registerPlugin');
 e=env();await e.c.MMANativeBack609.handle();assert.equal(e.backs(),1);assert.equal(e.homes(),0);pass('signed-in subpage delegates to existing navigation');
 let closed=0;e=env({dialog:{dispatchEvent:()=>true,close:()=>closed++}});await e.c.MMANativeBack609.handle();assert.equal(closed,1);assert.equal(e.homes(),0);pass('Back closes top dialog before navigating');
 e=env({dialog:{dispatchEvent:()=>false,close:()=>closed++}});await e.c.MMANativeBack609.handle();assert.equal(closed,1);pass('cancel-prevented dialogs stay open');
 e=env({saving:true});await e.c.MMANativeBack609.handle();await e.c.MMANativeBack609.home();assert.equal(e.homes(),0);assert.equal(e.backs(),0);pass('save in progress blocks Back and minimize');
 e=env({native:false});assert.equal(e.c.MMANativeBack609,undefined);pass('web browser behavior unchanged');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const a=app.indexOf('async function appBack424('),b=app.indexOf('window.MMABack424=',a);assert(a>=0&&b>a);const fn=app.slice(a,b);
 e=env();Object.assign(e.c,{employee:{id:'alice'},saving:false,activeTab:'attendance',activeOrderView:'',history:{pushState(){},replaceState(){}},MMALogoutConfirm422:()=>{throw Error('Native Back must not logout')}});vm.runInContext(fn,e.c);await e.c.appBack424(null);assert.equal(e.homes(),1);assert.equal(e.saves(),1);pass('actual app root Back minimizes and preserves login/draft');
 console.log(count+' Back scenarios passed; physical Android Back still needs device verification.');
})().catch(e=>{console.error(e);process.exitCode=1});
