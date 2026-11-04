/* One viewport owner: Android measures the WebView after applying system/IME insets. */
(() => {
 'use strict';
 const panel=document.getElementById('teamChatPanel');
 if(!panel)return;
 const style=document.createElement('style');
 style.textContent=`@media(max-width:720px){
 #teamChatPanel{height:var(--chat-height646,100dvh)!important;max-height:var(--chat-height646,100dvh)!important;top:var(--chat-top646,0px)!important;bottom:auto!important;padding:0!important;display:flex!important;flex-direction:column!important}
 #teamChatPanel[hidden]{display:none!important}
 #teamChatPanel>.tcHead{flex:0 0 auto!important}
 #teamChatPanel>.tcWorkspace{display:flex!important;flex:1 1 0!important;min-height:0!important;overflow:hidden!important}
 #teamChatPanel #tcConversation:not([hidden]){display:flex!important;flex-direction:column!important;flex:1 1 0!important;min-height:0!important;height:auto!important;max-height:100%!important;overflow:hidden!important}
 #teamChatPanel #tcMessages{flex:1 1 0!important;min-height:0!important;overflow-y:auto!important}
 #teamChatPanel #tcForm{flex:0 0 auto!important;position:relative!important;margin:0!important;padding:6px!important}
 #teamChatPanel #tcFiles{flex:0 0 auto!important;max-height:18vh;overflow:auto}
 #teamChatPanel #tcStatus:empty{display:none!important}
 #teamChatPanel #tcStatus{margin:0!important;padding:0 6px!important;flex:0 0 auto!important;max-height:32px;overflow:auto}
 #teamChatPanel #tcText{border-radius:22px!important;min-height:40px!important;height:40px!important;max-height:96px!important;padding:9px 12px!important}
 }`;
 document.head.append(style);
 let frame=0;
 function fit(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
  if(innerWidth>720)return;
  const native=window.Capacitor?.isNativePlatform?.(),v=window.visualViewport;
  const h=native&&window.MMAViewport646?.height||v?.height||innerHeight;
  panel.style.setProperty('--chat-height646',Math.round(h)+'px');
  panel.style.setProperty('--chat-top646',(native?0:v?.offsetTop||0)+'px');
 });}
 for(const name of ['resize','mma-native-viewport646'])window.addEventListener(name,fit);
 window.visualViewport?.addEventListener('resize',fit);
 window.visualViewport?.addEventListener('scroll',fit);
 panel.addEventListener('focusin',fit);
 new MutationObserver(fit).observe(panel,{attributes:true,attributeFilter:['hidden','class']});
 fit();
})();
