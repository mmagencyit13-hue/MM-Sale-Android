(() => {
  'use strict';
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.() || cap.getPlatform?.() !== 'android') return;
  const bridge = typeof cap.registerPlugin === 'function'
    ? cap.registerPlugin('MMADocuments') : cap.Plugins?.MMADocuments;
  if (!bridge) return;

  const storageKey = 'mma_sales_employee_session_v1';
  const endpoint = 'https://vuogorddmdumjpquvuqz.supabase.co/functions/v1/mma-app-update';
  const accountInstall = document.getElementById('accountInstall');
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Check for update';
  accountInstall.after(button);
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  button.after(status);
  let seenSession, pending, available = false;

  async function run(download = false, manual = false) {
    const token = localStorage.getItem(storageKey);
    if (!token || pending) return;
    pending = token;
    button.disabled = true;
    if (manual) status.textContent = download ? 'Preparing download…' : 'Checking for update…';
    try {
      const { versionCode: installed } = await bridge.appVersion();
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, installed, download }),
        signal: AbortSignal.timeout(12000),
      });
      if (token !== localStorage.getItem(storageKey)) return;
      if (!response.ok) throw Error('Update service is unavailable. Try again later.');
      const update = await response.json();
      available = update.available === true;
      button.textContent = available ? 'Download update' : 'Check for update';
      status.textContent = available ? `Update available · ${update.versionName}` : manual ? 'You’re up to date.' : '';
      if (available && download) {
        await bridge.openUpdate({ url: update.url });
        status.textContent = 'Open the downloaded APK and confirm Install.';
      } else if (available && !manual && window.confirm(`MMA Tradelink ${update.versionName} is available. Download now?`)) {
        pending = null;
        await run(true, true);
      }
    } catch {
      if (manual) status.textContent = 'Could not check or download the update. Try again later.';
    } finally {
      pending = null;
      button.disabled = false;
    }
  }

  function checkSession() {
    const token = localStorage.getItem(storageKey);
    if (token === seenSession && !available) return;
    const changed = token !== seenSession;
    seenSession = token;
    if (changed) {
      available = false;
      status.textContent = '';
      button.textContent = 'Check for update';
    }
    if (token && changed) void run();
  }
  button.addEventListener('click', () => void run(available, true));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && localStorage.getItem(storageKey)) void run(false, true);
  });
  setInterval(checkSession, 2000);
  checkSession();
})();
