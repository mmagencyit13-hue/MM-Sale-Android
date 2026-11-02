const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const links=fs.readFileSync('www/order-links-v629.js','utf8'),docs=fs.readFileSync('www/native-documents-v629.js','utf8');
assert.match(fs.readFileSync('www/config.js','utf8'),/publicSiteUrl='https:\/\/mmasales\.netlify\.app\/'/);
const token='11111111-1111-4111-8111-111111111111';
function env(native,base,href='https://real.example/app/index.html') {const c={Capacitor:{isNativePlatform:()=>native},MMA_CONFIG:{publicSiteUrl:base},location:{href},URL};c.window=c;vm.createContext(c);vm.runInContext(links,c);return c.MMAOrderLinks629;}
assert.equal(env(true,'https://public.example/sale/').image(token),'https://public.example/sale/order-image.html#'+token);
assert.equal(new URL(env(true,'https://public.example/').image(token,true)).searchParams.get('business'),'grey');
assert.throws(()=>env(true,'https://localhost/').image(token),/public HTTPS/);
assert.throws(()=>env(true,'').image(token),/not configured/);
assert.throws(()=>env(true,'https://public.example/').image('code'),/not created/);
assert.equal(env(false,'https://ignored.example/').image(token),'https://real.example/app/order-image.html#'+token);
(async()=>{
 const calls=[],listeners={};class Anchor {constructor(){this.href='';this.download='';} hasAttribute(k){return k==='download'&&!!this.download;}click(){calls.push('web');}}
 const c={console,Blob,Uint8Array,URL,HTMLAnchorElement:Anchor,btoa:s=>Buffer.from(s,'binary').toString('base64'),fetch:async()=>new Response(new Blob(['%PDF-1.7\n'],{type:'application/pdf'})),document:{getElementById:()=>null,addEventListener:(k,f)=>listeners[k]=f},Capacitor:{isNativePlatform:()=>true,Plugins:{MMADocuments:Object.fromEntries(['open','save','share','openUrl'].map(k=>[k,async d=>{calls.push({k,d});return {opened:true}}]))}}};c.window=c;c.open=()=>{};c.alert=()=>{};vm.createContext(c);vm.runInContext(docs,c);
 const blob=new Blob(['%PDF-1.7\n'],{type:'application/pdf'});
 await c.MMADocuments629.transfer(blob,'order.pdf','open');assert.equal(calls.at(-1).k,'open');assert.equal(Buffer.from(calls.at(-1).d.base64,'base64').toString(),'%PDF-1.7\n');
 await c.MMADocuments629.transfer(blob,'../bill.pdf','save');assert(!calls.at(-1).d.name.includes('/'));assert.equal(calls.at(-1).k,'save');
 await assert.rejects(c.MMADocuments629.transfer(new Blob([]),'empty.pdf'),/between/);
 const a=new Anchor();a.href='blob:https://localhost/file';a.download='bill.pdf';a.click();await new Promise(setImmediate);assert.equal(calls.at(-1).k,'save');
 a.href='https://public.example/file';a.click();assert.equal(calls.at(-1),'web');
 await assert.rejects(c.MMADocuments629.fromUrl('https://private.example/file','','open'),/prepared local/);
 console.log('PASS V629: public HTTPS/grey links, invalid-token/localhost rejection, Chrome preservation, native PDF open/save, detached download anchors, empty files and filename sanitization');
})().catch(e=>{console.error(e);process.exitCode=1});
