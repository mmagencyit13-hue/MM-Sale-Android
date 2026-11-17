(()=>{
    'use strict';
    const cap=window.Capacitor;
    if(!cap?.isNativePlatform?.())return;
    const biometric=typeof cap.registerPlugin==='function'
        ?cap.registerPlugin('MMABiometric'):cap.Plugins?.MMABiometric;
    if(!biometric)return;

    const key='mma_biometric_lock_v661';
    const enabled=()=>localStorage.getItem(key)==='yes';
    const settings=document.createElement('section');
    settings.className='card';
    settings.innerHTML='<button type="button" class="outline"></button><p role="status"></p>';
    document.getElementById('accountInstall').before(settings);
    const toggle=settings.querySelector('button');
    const status=settings.querySelector('p');
    function draw(){
        toggle.textContent=enabled()?'Disable Biometric Unlock':'Enable Biometric Unlock';
    }
    toggle.onclick=async()=>{
        toggle.disabled=true;
        try{
            const wasEnabled=enabled();
            await biometric.authenticate();
            if(wasEnabled)localStorage.removeItem(key);
            else localStorage.setItem(key,'yes');
            status.textContent=wasEnabled?'Biometric unlock disabled.':'Biometric unlock enabled for this phone.';
        }catch(error){
            status.textContent=error.message||'Biometric authentication was not completed.';
        }finally{
            toggle.disabled=false;
            draw();
        }
    };
    draw();

    let unlocked=false;
    let unlocking;
    window.MMABiometric661={
        unlock(){
            if(unlocked||!enabled())return Promise.resolve(true);
            if(unlocking)return unlocking;
            unlocking=new Promise(resolve=>{
                const dialog=document.createElement('dialog');
                dialog.innerHTML='<h3>Unlock MMA Tradelink</h3><p role="status"></p><button type="button" data-unlock>Unlock with Biometrics</button> <button type="button" class="outline" data-login>Sign in with Password</button>';
                document.body.append(dialog);
                dialog.addEventListener('cancel',event=>event.preventDefault());
                const button=dialog.querySelector('[data-unlock]');
                const signIn=dialog.querySelector('[data-login]');
                function finish(result){
                    unlocked=result;
                    dialog.close();
                    dialog.remove();
                    resolve(result);
                }
                signIn.onclick=()=>{
                    void ERPEmployeeAuth.logout();
                    const message=document.getElementById('loginMessage');
                    if(message)message.textContent='Sign in with your password.';
                    finish(false);
                };
                const authenticate=async()=>{
                    button.disabled=signIn.disabled=true;
                    try{
                        await biometric.authenticate();
                        finish(true);
                    }catch(error){
                        dialog.querySelector('p').textContent=error.message||'Unlock cancelled.';
                        button.disabled=signIn.disabled=false;
                    }
                };
                button.onclick=authenticate;
                dialog.showModal();
                void authenticate();
            }).finally(()=>{unlocking=null});
            return unlocking;
        }
    };
})();
