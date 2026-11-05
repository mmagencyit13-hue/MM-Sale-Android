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
  const offer = document.getElementById('biometricOffer655');
  const offerEnable = document.getElementById('biometricOfferEnable655');
  const offerStatus = document.getElementById('biometricOfferStatus655');
  const offered = new Set();
  window.MMAOnboard655 = async function (employeeId) {
    if (window.ERPEmployeeAuth?.employee?.id !== employeeId ||
        localStorage.getItem(key) || offered.has(employeeId) || !offer || offer.open) return;
    try {
      const result = await plugin.available();
      if (!result.ok || window.ERPEmployeeAuth?.employee?.id !== employeeId || offered.has(employeeId)) return;
      offered.add(employeeId);
      offerStatus.textContent = '';
      offer.showModal();
    } catch {}
  };
  offerEnable?.addEventListener('click', async () => {
    const employeeId = window.ERPEmployeeAuth?.employee?.id;
    offerEnable.disabled = true;
    try {
      await plugin.unlock();
      if (window.ERPEmployeeAuth?.employee?.id !== employeeId) return;
      localStorage.setItem(key, '1');
      refreshLabel();
      offerStatus.textContent = 'Fingerprint unlock is enabled.';
      offer.querySelector('form button').textContent = 'OK';
    } catch (error) {
      offerStatus.textContent = error.message || 'Fingerprint setup could not finish.';
      offerEnable.disabled = false;
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
