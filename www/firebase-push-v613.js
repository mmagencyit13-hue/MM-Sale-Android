(() => {
  'use strict';
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  const push = typeof cap.registerPlugin === 'function'
    ? cap.registerPlugin('PushNotifications') : cap.Plugins?.PushNotifications;
  const panel = document.createElement('section');
  panel.id = 'firebasePush611';
  panel.innerHTML = '<b>Notifications</b>' +
    '<button type="button" class="outline" data-register>Enable Notifications</button>' +
    '<button type="button" class="outline" data-test>Test Notification</button>' +
    '<small role="status" aria-live="polite"></small>';
  document.getElementById('accountInstall').before(panel);
  const registerButton = panel.querySelector('[data-register]');
  const testButton = panel.querySelector('[data-test]');
  const localPanel = document.getElementById('accountPush424');
  if (localPanel) localPanel.hidden = true;
  const label = panel.querySelector('small');
  let token = '', waiting = null, listenersReady = null;
  let bound = '', binding = null;
  const optKey = 'mma_firebase_optin_613';
  const session = () => localStorage.getItem('mma_sales_employee_session_v1') || '';
  let device = localStorage.getItem('mma_firebase_device_613');
  if (!device) { device = crypto.randomUUID(); localStorage.setItem('mma_firebase_device_613', device); }
  const endpoint = window.MMA_CONFIG.employeeGateway.replace(/employee-gateway$/, 'mma-firebase-push');
  async function request(op, args = {}) {
    const login = session();
    if (!login || !window.ERPEmployeeAuth?.employee?.id) throw Error('Login once to connect this phone. Notifications can continue after logout.');
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: window.MMA_CONFIG.publicKey, 'x-erp-session': login }, body: JSON.stringify({ op, device_id: device, ...args }) });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Notification server unavailable.');
    if (login !== session()) throw Error('Login changed. Enable notifications again.');
    return result;
  }
  async function bind() {
    if (!token || !session() || !window.ERPEmployeeAuth?.employee?.id) {
      status('Phone permission enabled. Login once to connect notifications to your account.'); return false;
    }
    const signature = session() + ':' + token;
    if (bound === signature) return true;
    if (binding) { await binding; if (bound === signature) return true; }
    binding = (async () => {
      const result = await request('register', { token });
      if (!result.ok) throw Error('Device was not connected.');
      bound = signature;
      status('Notifications connected. Chat and scheduled alerts can arrive after logout or with the app in background.');
    })();
    try { await binding; return true; } finally { binding = null; }
  }
  const received = new Set();
  function status(text) { label.textContent = text; }
  function settle(error, value) {
    const current = waiting;
    if (!current) return;
    waiting = null;
    clearTimeout(current.timer);
    if (error) current.reject(error); else current.resolve(value);
  }
  async function listeners() {
    if (listenersReady) return listenersReady;
    if (!push || !cap.isPluginAvailable?.('PushNotifications')) {
      throw Error('Firebase plugin is missing. Install the new V611 APK.');
    }
    listenersReady = (async () => {
      await push.addListener('registration', value => {
        token = String(value.value || '');
        if (!token) { settle(Error('Firebase returned an empty device token.')); return; }
        status('Firebase device registered. Connecting your account…');
        bound = '';
        if (localStorage.getItem(optKey) === 'yes') void bind().catch(e => status(e.message));
        settle(null, token);
      });
      await push.addListener('registrationError', error => {
        const failure = Error(error.error || error.message || 'Firebase registration failed.');
        status(failure.message); settle(failure);
      });
      await push.addListener('pushNotificationReceived', async notification => {
        const id = String(notification.id || '');
        if (id && received.has(id)) return;
        if (id) {
          received.add(id);
          if (received.size > 200) received.delete(received.values().next().value);
        }
        try {
          if (typeof window.MMANativeNotifications608?.receiveRemote !== 'function') throw Error('Android notification display module unavailable.');
          const displayed = await window.MMANativeNotifications608.receiveRemote(notification.data || {});
          if (!displayed) throw Error('Phone notification permission is blocked.');
          status('Firebase push received while app is open. Check your phone notification panel.');
        } catch (e) { status('Firebase arrived, but phone display failed: ' + e.message); }
      });
      await push.addListener('pushNotificationActionPerformed', event => {
        window.MMANativeNotifications608?.openRemote(event.notification?.data || {});
        status('Firebase notification opened. Login if requested.');
      });
    })();
    try { await listenersReady; } catch (e) { listenersReady = null; throw e; }
  }
  async function enable() {
    await listeners();
    let p = await push.checkPermissions();
    if (p.receive !== 'granted') p = await push.requestPermissions();
    if (p.receive !== 'granted') throw Error('Allow notifications in phone settings, then retry.');
    if (typeof window.MMANativeNotifications608?.enable !== 'function') {
      throw Error('Android notification module did not load. Install the corrected V612 APK.');
    }
    await window.MMANativeNotifications608.enable();
    await push.createChannel({ id: 'mma_messages_tasks_v608', name: 'MM Agency messages and tasks', importance: 5, visibility: 0, vibration: true });
    localStorage.setItem(optKey, 'yes');
    if (token) { await bind(); return token; }
    if (waiting) { const value = await waiting.promise; await bind(); return value; }
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    waiting = { promise, resolve, reject, timer: setTimeout(() => {
      settle(Error('Firebase token timed out. Check internet and Google Play services, then retry.'));
    }, 30000) };
    status('Registering this Android device with Firebase…');
    // register() resolves before the token event. Waiting is created first to avoid a race.
    Promise.resolve(push.register()).catch(e => settle(e));
    const value = await promise;
    await bind();
    return value;
  }
  registerButton.onclick = async () => {
    registerButton.disabled = true;
    try { await enable(); } catch (e) { status(e.message); }
    finally { registerButton.disabled = false; }
  };
  testButton.onclick = async () => {
    testButton.disabled = true;
    try {
      await enable();
      const result = await request('test');
      status('Firebase test queued. Lock the phone or return to the home screen and check the notification panel.');
      let polls = 0;
      const check = async () => {
        try {
          const report = await request('status', { job_id: result.job_id });
          if (report.accepted) { status('Firebase accepted the test for this phone. Check the notification panel.'); return; }
          if (report.error) { status('Server test failed: ' + report.error); return; }
          if (++polls < 8) setTimeout(check, 5000);
          else status('Test still queued. Check the notification worker deployment and cron.');
        } catch (e) { status(e.message); }
      };
      setTimeout(check, 3000);
    } catch (e) { status(e.message || 'Notification test failed.'); }
    finally { testButton.disabled = false; }
  };
  window.MMAFirebase613 = { enable, get token() { return token; },
    get serverBound() { return !!bound && bound === session() + ':' + token; },
    get ownsEvents() { return localStorage.getItem(optKey) === 'yes'; } };
  window.sb?.auth.onAuthStateChange(() => { bound = ''; if (token && session()) void bind().catch(e => status(e.message)); });
  // Refresh binding after session restoration, token rotation, or a different employee signs in.
  // Logout retains the server's generic-alert association; it does not retain login credentials.
  setInterval(() => {
    if (localStorage.getItem(optKey) !== 'yes') return;
    if (!token) void push.checkPermissions().then(p => { if (p.receive === 'granted') return enable(); }).catch(e => status(e.message));
    else if (session()) void bind().catch(e => status(e.message));
  }, 10000);
  // Receive/tap listeners are ready even when cold-starting from a notification.
  void listeners().catch(e => status(e.message));
})();
