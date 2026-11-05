(() => {
  'use strict';
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform?.() || capacitor.getPlatform?.() !== 'android') return;
  const plugin = capacitor.Plugins?.MMABiometric || capacitor.registerPlugin?.('MMABiometric');
  if (!plugin) return;
  const key = 'mma_biometric_v654';
  const sessionKey = 'mma_sales_employee_session_v1';
  const button = document.getElementById('biometricToggle654');
  function refreshLabel() {
    button.textContent = localStorage.getItem(key) ? 'Disable biometric unlock' : 'Enable biometric unlock';
  }
  refreshLabel();
  button.hidden = false;
  button.addEventListener('click', async () => {
    const status = document.getElementById('biometricStatus654');
    button.disabled = true;
    try {
      await plugin.unlock();
      if (localStorage.getItem(key)) localStorage.removeItem(key);
      else localStorage.setItem(key, '1');
      refreshLabel();
      status.textContent = 'Biometric preference saved.';
    } catch (error) {
      status.textContent = error.message || 'Biometric authentication unavailable.';
    } finally {
      button.disabled = false;
    }
  });
  window.MMARestore654 = async function () {
    if (localStorage.getItem(key) && localStorage.getItem(sessionKey)) {
      try {
        await plugin.unlock();
      } catch {
        return null;
      }
    }
    return window.ERPEmployeeAuth.refresh();
  };
})();
