/* Attendance uses the installed native Geolocation controller, including its Android settings resolution dialog. */
(() => {
 'use strict';
 const cap=window.Capacitor;
 if(!cap?.isNativePlatform?.())return;
 const available=cap.isPluginAvailable?.('Geolocation');
 const geo=available?(typeof cap.registerPlugin==='function'?cap.registerPlugin('Geolocation'):cap.Plugins?.Geolocation):null;
 async function getLocation(){
  if(!geo?.getCurrentPosition)throw Error('Native location module is missing. Install the updated MMA Tradelink APK.');
  // Do not call checkPermissions first: it rejects when GPS is off before the controller can offer resolution.
  const result=await geo.getCurrentPosition({enableHighAccuracy:true,timeout:15000,maximumAge:0,enableLocationFallback:true});
  const c=result?.coords;
  if(!c||!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude))throw Error('Location could not be obtained. Please retry.');
  return c;
 }
 function message(error){
  switch(String(error?.code||'')){
   case 'OS-PLUG-GLOC-0003':return 'Location permission allow karein, phir Allow Location / Retry dabayein.';
   case 'OS-PLUG-GLOC-0009':return 'Location ON karne ka system popup cancel hua. Allow Location / Retry dabakar OK karein.';
   case 'OS-PLUG-GLOC-0007':return 'Location abhi OFF hai. Allow Location / Retry se system request dobara karein.';
   case 'OS-PLUG-GLOC-0010':return 'Location milne mein time laga. Khuli jagah mein Allow Location / Retry dabayein.';
   default:return error?.message||'Location nahi mil paayi. Allow Location / Retry dabayein.';
  }
 }
 window.MMAAttendanceLocation652={getLocation,message};
})();
