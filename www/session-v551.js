(()=>{
    'use strict';

    const activityKey='mma_activity551';
    const sessionKey='mma_sales_employee_session_v1';
    const inactivityLimit=96*60*60*1000;
    let lastWrite=0;
    let expiryRequest=null;
    let lastTouch=0;
    let touching=false;
    function syncActivity(){
        if(touching||document.hidden||!ERPEmployeeAuth.employee||navigator.onLine===false||Date.now()-lastTouch<60000)return;
        touching=true;
        lastTouch=Date.now();
        void ERPEmployeeAuth.touch670().catch(()=>{}).finally(()=>{touching=false;});
    }

    function check(recordActivity=false){
        if(!localStorage.getItem(sessionKey)||expiryRequest)return !expiryRequest;
        const now=Date.now();
        const last=Number(localStorage.getItem(activityKey));
        if(last>0&&now-last>=inactivityLimit){
            window.MMASaveScreen551?.();
            // logout clears local credentials before starting the network request.
            expiryRequest=ERPEmployeeAuth.logout().finally(()=>{expiryRequest=null});
            document.getElementById('app')?.classList.add('hide');
            document.getElementById('login')?.classList.remove('hide');
            const message=document.getElementById('loginMessage');
            if(message)message.textContent='Please sign in again after 96 hours of inactivity.';
            return false;
        }
        if(!last||last>now||(recordActivity&&now-lastWrite>=1000)){
            lastWrite=now;
            localStorage.setItem(activityKey,String(now));
        }
        if(recordActivity)syncActivity();
        return true;
    }

    window.MMAActivity660={check,pendingLogout:()=>expiryRequest};
    for(const type of ['pointerdown','keydown','touchstart','scroll']){
        document.addEventListener(type,()=>{
            if(!document.hidden)check(true);
        },{capture:true,passive:true});
    }
    document.addEventListener('visibilitychange',()=>{
        if(document.hidden)window.MMASaveScreen551?.();
        else check(true);
    });
    window.addEventListener('focus',()=>check(true));
    window.addEventListener('online',()=>{if(!document.hidden)check(true);});
    setInterval(()=>{if(!document.hidden)check(true);},30000);
    sb.auth.onAuthStateChange(event=>{
        if(event==='SIGNED_IN'){
            lastWrite=Date.now();
            localStorage.setItem(activityKey,String(lastWrite));
        }else if(event==='SIGNED_OUT'){
            lastTouch=0;
            localStorage.removeItem(activityKey);
        }
    });
    navigator.serviceWorker?.addEventListener('message',event=>{
        if(event.data?.type!=='mma-chat-route551')return;
        try{
            const url=new URL(event.data.url);
            if(url.origin===location.origin)history.replaceState(history.state,'',url.href);
        }catch{}
    });
})();
