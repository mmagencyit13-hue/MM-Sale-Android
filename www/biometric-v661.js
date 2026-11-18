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
    const loginButton=document.createElement('button');
    loginButton.type='button';
    loginButton.className='outline';
    loginButton.textContent='Sign in with Biometrics';
    loginButton.hidden=true;
    const form=document.getElementById('loginForm');
    form.append(loginButton);
    async function showLogin(){
        try{
            const state=await biometric.status();
            loginButton.hidden=!(enabled()&&state.available&&state.saved&&!localStorage.getItem('mma_sales_employee_session_v1'));
        }catch{loginButton.hidden=true;}
    }
    loginButton.onclick=async()=>{
        const submit=form.querySelector('[type=submit]');
        if(submit?.dataset.appBusy433==='true')return;
        loginButton.disabled=true;
        try{
            await window.MMAActivity660?.pendingLogout();
            const result=await biometric.readLogin();
            const saved=JSON.parse(result.credentials);
            await window.MMABiometricLogin666(saved.login,saved.password);
        }catch(error){
            document.getElementById('loginMessage').textContent=error.message||'Biometric login failed. Use your password.';
        }finally{loginButton.disabled=false;}
    };
    sb.auth.onAuthStateChange(()=>void showLogin());
    window.addEventListener('pageshow',showLogin);
    void showLogin();

    function draw(){
        toggle.textContent=enabled()?'Disable Biometric Unlock':'Enable Biometric Unlock';
    }
    toggle.onclick=async()=>{
        toggle.disabled=true;
        try{
            const wasEnabled=enabled();
            await biometric.authenticate();
            if(wasEnabled){await biometric.clearLogin();localStorage.removeItem(key);}
            else localStorage.setItem(key,'yes');
            status.textContent=wasEnabled?'Biometric unlock disabled.':'Biometric unlock enabled. Sign in with your password once to set up biometric re-login.';
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
        get signingIn(){return loginButton.disabled;},
        async enroll(login,password){
            if(!enabled())return;
            const state=await biometric.status();
            if(!state.available)return;
            // Replace credentials after a different user or password signs in.
            await biometric.clearLogin();
            await biometric.saveLogin({credentials:JSON.stringify({login,password})});
            void showLogin();
        },
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
