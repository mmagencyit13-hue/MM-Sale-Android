(()=>{'use strict';
const panel=document.getElementById('teamChatPanel');if(!panel)return;
const box=panel.querySelector('#tcMessages'),text=panel.querySelector('#tcText');
let following=true,frame=0,writing=false;window.addEventListener("mma-message-jump551",()=>{following=false;cancelAnimationFrame(frame)});
function bottom(){if(!following||panel.hidden)return;writing=true;box.scrollTop=box.scrollHeight;requestAnimationFrame(()=>{writing=false})}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(bottom)}
box.addEventListener('scroll',()=>{if(!writing)following=box.scrollHeight-box.clientHeight-box.scrollTop<100},{passive:true});
// Explicit upward navigation must remain available for reading history.
box.addEventListener('wheel',e=>{if(e.deltaY<0)following=false},{passive:true});
let touchY=0;box.addEventListener('touchstart',e=>{touchY=e.touches[0]?.clientY||0},{passive:true});
box.addEventListener('touchmove',e=>{if((e.touches[0]?.clientY||0)>touchY+8)following=false},{passive:true});
panel.addEventListener('submit',()=>{following=true;schedule()},true);
panel.addEventListener('click',e=>{if(e.target.closest('.tcLatest,[data-bm533],[data-buddy-service]')){following=true;schedule()}});
new MutationObserver(schedule).observe(box,{childList:true,subtree:true});
box.addEventListener('load',schedule,true);
if(window.ResizeObserver){const resize=new ResizeObserver(schedule);resize.observe(box);resize.observe(panel.querySelector('#tcForm'))}
const title=panel.querySelector('#tcTitle');new MutationObserver(()=>{following=true;schedule()}).observe(title,{childList:true});
text.addEventListener('focus',schedule);window.visualViewport?.addEventListener('resize',schedule);
const style=document.createElement('style');style.textContent=`
#teamChatPanel #tcConversation{min-height:0;overflow:hidden}
#teamChatPanel #tcMessages{min-height:0;flex:1 1 0;overflow-y:auto;overflow-anchor:none;scroll-behavior:auto;overscroll-behavior-y:contain}
#teamChatPanel #tcForm,#teamChatPanel #tcFiles,#teamChatPanel .bm533Tools,#teamChatPanel .tcRoomHead{flex-shrink:0}
#teamChatPanel #tcForm{position:relative;margin:0}
#teamChatPanel .tcComposeRow{align-items:center}
#teamChatPanel #tcText{box-sizing:border-box;height:48px!important;min-height:48px!important;max-height:48px!important;resize:none!important;overflow-y:auto;line-height:20px;scroll-behavior:auto}
#teamChatPanel #tcStatus{flex-shrink:0;max-height:44px;overflow-y:auto;margin:0}
`;document.head.append(style);schedule();
})();