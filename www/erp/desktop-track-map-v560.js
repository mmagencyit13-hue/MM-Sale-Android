(()=>{'use strict';const id='executiveTrackMapV560',q=id=>document.getElementById(id),allowed=()=>window.MMALocation557?.canReport?.()===true;
const page=document.createElement('section');page.id=id;page.className='page hide';page.innerHTML='<div class="head"><div><h1>Executive Track Map</h1><p>Executive-wise · Day / Month</p></div><button type="button" class="light" data-back>← Back</button></div><section><button type="button" data-desktop-track560>Open Track Map</button><p data-track-entry-status560 role="status"></p></section>';document.querySelector('main').append(page);
const items=APP_GROUPS.attendanceMenu.items;if(!items.some(x=>x.page===id))items.push({icon:'🗺',name:'Executive Track Map',sub:'Executive · Day-wise · Month-wise',page:id});
v101PageGroup[id]='attendanceMenu';v39ModuleForPage[id]='Attendance';v92Parent[id]='attendanceViewV353';
const oldRight=v92Right;v92Right=function(target,...args){if(target===id)return{show:allowed(),add:false,update:false,delete:false,export:false};return oldRight.call(this,target,...args)};
const header=document.querySelector('#attendanceViewV353 .headActions')||document.querySelector('#attendanceViewV353 .head');if(header&&!q('desktopTrackMap560')){const b=document.createElement('button');b.type='button';b.id='desktopTrackMap560';b.dataset.desktopTrack560='';b.textContent='Executive Track Map';b.className='light';header.append(b)}
// Replace the former observer-inserted button with a stable desktop entry.
q('openTracking557')?.remove();
async function show(){const status=page.querySelector('[data-track-entry-status560]');if(!allowed()){status.textContent='Admin or authorized CEO login required.';return}status.textContent='';try{await window.MMALocation557.open()}catch(e){status.textContent=e.message}}
document.addEventListener('click',e=>{if(e.target.closest('[data-desktop-track560]'))void show()});
const prior=openPage;openPage=function(target,...args){const result=prior.call(this,target,...args);if(target===id&&allowed()&&!page.classList.contains('hide'))void show();return result};
})();
