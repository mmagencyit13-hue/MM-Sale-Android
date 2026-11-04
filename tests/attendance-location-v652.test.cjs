const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('www/attendance-location-v652.js','utf8');
(async()=>{
 let args;
 function env(native=true,legacy=false){const c={Capacitor:{isNativePlatform:()=>native,isPluginAvailable:()=>true,Plugins:{Geolocation:{getCurrentPosition:async a=>{args=a;return{coords:{latitude:26.9,longitude:75.8,accuracy:10}}}}}}};if(!legacy)c.Capacitor.registerPlugin=()=>c.Capacitor.Plugins.Geolocation;c.window=c;vm.createContext(c);vm.runInContext(src,c);return c;}
 let c=env();const p=await c.MMAAttendanceLocation652.getLocation();assert.equal(p.latitude,26.9);assert.equal(args.maximumAge,0);assert.equal(args.enableHighAccuracy,true);
 c=env(true,true);assert.equal((await c.MMAAttendanceLocation652.getLocation()).longitude,75.8);
 assert(!env(false).MMAAttendanceLocation652);
 const mobile=fs.readFileSync('www/mobile-v48.js','utf8'),index=fs.readFileSync('www/index.html','utf8');
 assert(mobile.includes('if(window.MMAAttendanceLocation652)return window.MMAAttendanceLocation652;'));
 assert(mobile.includes('allowLocation.onclick=()=>nativeLocation444?void requestLocation440():showPermission443();'));
 assert(!index.includes('During checked-in duty'));
 assert(index.indexOf('attendance-location-v652.js')<index.indexOf('mobile-v48.js'));
 console.log('PASS attendance calls installed native Geolocation directly, supports injected bridge, retains browser fallback, and removes only the requested notice. Native Android settings popup needs device verification.');
})().catch(e=>{console.error(e);process.exitCode=1});
