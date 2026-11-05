(()=>{'use strict';
document.addEventListener("visibilitychange",()=>{if(document.hidden)window.MMASaveScreen551?.()});
navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='mma-chat-route551'){try{const url=new URL(e.data.url);if(url.origin===location.origin)history.replaceState(history.state,'',url.href)}catch{}}});
})();
