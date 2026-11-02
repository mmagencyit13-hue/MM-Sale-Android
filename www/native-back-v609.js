(() => {
  'use strict';
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  const app = (typeof cap.registerPlugin === 'function' ? cap.registerPlugin('App') : cap.Plugins?.App);
  let busy = false;
  const isSaving = () => window.MMASales?.isSaving?.() === true;
  async function home() {
    if (isSaving()) return;
    window.MMASaveScreen551?.();
    await app.minimizeApp();
  }
  async function handle() {
    if (busy || isSaving()) return;
    busy = true;
    try {
      const dialogs = [...document.querySelectorAll('dialog[open]')];
      const dialog = dialogs[dialogs.length - 1];
      if (dialog) {
        const event = new Event('cancel', { cancelable: true });
        if (dialog.dispatchEvent(event)) dialog.close();
        return;
      }
      const shell = document.getElementById('app');
      if (!window.ERPEmployeeAuth?.employee || shell?.classList.contains('hide')) {
        await home();
        return;
      }
      // Preserve the app's existing drawer, form, task and tab history handling.
      window.MMABack424?.();
    } catch (e) {
      const label = document.getElementById('loginMessage');
      if (label) label.textContent = 'Could not return to phone home: ' + (e.message || 'please retry');
    } finally { setTimeout(() => { busy = false; }, 250); }
  }
  window.MMANativeBack609 = { handle, home };
})();
