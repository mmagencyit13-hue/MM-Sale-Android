(()=>{
'use strict';
const cap=window.Capacitor;
if(!cap?.isNativePlatform?.())return;
window.MMA_NATIVE_BUILD='6.32.0';
// Web Push service workers are not an Android background notification system.
// Fail promptly instead of hanging on serviceWorker.ready in the alert setup.
if(navigator.serviceWorker){
 navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).catch(()=>{});
 navigator.serviceWorker.register=()=>Promise.reject(new Error('Background push is not enabled in this APK. Use in-app alerts while app is open.'));
}
if(window.caches)caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).catch(()=>{});
const geo=typeof cap.registerPlugin==='function'?cap.registerPlugin('Geolocation'):cap.Plugins?.Geolocation;
if(navigator.geolocation&&geo){
 navigator.geolocation.getCurrentPosition=(ok,fail,options={})=>{
  geo.checkPermissions().then(p=>p.location==='granted'||p.coarseLocation==='granted'?p:geo.requestPermissions()).then(()=>geo.getCurrentPosition(options)).then(ok,e=>fail?.({code:2,message:e.message||'Location unavailable'}));
 };
 navigator.geolocation.watchPosition=(ok,fail,options={})=>{
  let stopped=false,id; const token={stop:()=>{stopped=true;if(id)void geo.clearWatch({id});}};
  geo.requestPermissions().then(()=>geo.watchPosition(options,(p,e)=>e?fail?.({code:2,message:e.message}):p&&ok(p))).then(value=>{id=value;if(stopped)void geo.clearWatch({id});}).catch(e=>fail?.({code:2,message:e.message}));return token;
 };
 navigator.geolocation.clearWatch=token=>token?.stop?.();
}
})();
