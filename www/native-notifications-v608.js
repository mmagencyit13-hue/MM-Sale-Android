(() => {
  'use strict';
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  const local = (typeof cap.registerPlugin === 'function' ? cap.registerPlugin('LocalNotifications') : cap.Plugins?.LocalNotifications);
  const channelId = 'mma_messages_tasks_v608';
  const startTime = Date.now();
  const who = () => window.ERPEmployeeAuth?.employee?.id || '';
  let enabled = false, channelReady = false, pendingRoute = null, opening = false;
  let accountGeneration = 0;
  const chatTimes = new Map(), taskTimes = new Map(), queue = [];
  let worker = false, sequence = 1000;
  const notificationIds = new Map();
  const panel = document.createElement('section');
  panel.id = 'accountPush424';
  panel.innerHTML = '<b>Android Notifications · Local Display Test</b>' +
    '<button type="button" class="outline" data-enable>Enable Android Notifications</button>' +
    '<button type="button" class="outline" data-test>Test Phone Notification</button>' +
    '<button type="button" class="outline" data-lock>Test After Lock (about 15 seconds)</button>' +
    '<small role="status" aria-live="polite"></small>';
  document.getElementById('accountInstall').before(panel);
  const enableButton = panel.querySelector('[data-enable]');
  const testButton = panel.querySelector('[data-test]');
  const lockButton = panel.querySelector('[data-lock]');
  const label = panel.querySelector('small');
  const status = text => {
    label.textContent = text;
    const other = document.getElementById('notificationStatus');
    if (other) other.textContent = text;
  };
  function render() {
    enableButton.hidden = enabled;
    const other = document.getElementById('enableNotifications');
    if (other) other.hidden = enabled;
  }
  async function channel() {
    if (channelReady) return;
    await local.createChannel({
      id: channelId, name: 'MM Agency messages and tasks',
      description: 'Chat and assigned-task alerts', importance: 5,
      visibility: 0, vibration: true, lights: true, lightColor: '#7A2D32'
    });
    channelReady = true;
  }
  async function permission(prompt) {
    if (!local || !cap.isPluginAvailable('LocalNotifications')) {
      throw Error('Native notification plugin is missing. Install the new notification-test APK.');
    }
    let p = await local.checkPermissions();
    if (prompt && p.display !== 'granted') p = await local.requestPermissions();
    const previouslyEnabled = enabled;
    enabled = p.display === 'granted';
    if (enabled && !previouslyEnabled) taskTimes.clear();
    render();
    if (enabled) await channel();
    return enabled;
  }
  async function enable() {
    if (!await permission(true)) {
      throw Error('Notifications blocked. Phone Settings > Apps > MM Agency Firebase Test 611 > Notifications: Allow.');
    }
    status('Android alerts enabled. Phone display permission is ready. Enable Notifications to connect Firebase.');
    return true;
  }
  async function show(title, body, extra, delay = 0, knownId) {
    const id = knownId || ++sequence;
    const notification = {
      id, title, body, channelId, smallIcon: 'ic_stat_mma',
      iconColor: '#7A2D32', autoCancel: true,
      extra: { ...extra, expires_at: Date.now() + 86400000 }
    };
    if (delay) notification.schedule = { at: new Date(Date.now() + delay), allowWhileIdle: true };
    await local.schedule({ notifications: [notification] });
    return id;
  }
  async function test(delay = 0) {
    await enable();
    const owner = who(), generation = accountGeneration;
    if (!owner) throw Error('Login first, then test notifications.');
    const id = delay ? 608002 : 608001;
    await local.cancel({ notifications: [{ id }] });
    if (generation !== accountGeneration || owner !== who()) return false;
    await show('MM Agency · Notification Test',
      delay ? 'Scheduled phone-display test. This is not a new message from the server.' : 'Native Android test: check your phone notification panel.',
      { type: 'test', recipient_id: owner }, delay, id);
    status(delay ? 'Test scheduled for about 15 seconds. Lock the phone now. Android battery settings may delay it; this tests display only, not server push.' :
      'Test submitted to Android. Swipe down to check. Sound/pop-up depends on this notification channel and phone settings.');
    return true;
  }
  async function click(button, action) {
    button.disabled = true;
    try { await action(); } catch (e) { status(e.message || 'Notification failed.'); }
    finally { button.disabled = false; }
  }
  enableButton.onclick = () => click(enableButton, enable);
  testButton.onclick = () => click(testButton, () => test());
  lockButton.onclick = () => click(lockButton, () => test(15000));

  function enqueue(kind, key, version, owner, title, body, extra) {
    const map = kind === 'chat' ? chatTimes : taskTimes;
    const previous = map.get(key);
    // Record before enqueue so overlapping poll results cannot duplicate notifications.
    if (previous === version) return;
    map.set(key, version);
    queue.push({ kind, key, owner, title, body, extra, version, generation: accountGeneration });
    void flush();
  }
  async function flush() {
    if (worker) return;
    worker = true;
    try {
      while (queue.length) {
        const item = queue.shift();
        if (item.owner !== who() || item.generation !== accountGeneration) continue;
        const map = item.kind === 'chat' ? chatTimes : taskTimes;
        if (map.get(item.key) !== item.version) continue;
        if (!await permission(false)) continue;
        if (item.owner !== who() || item.generation !== accountGeneration) continue;
        if (map.get(item.key) !== item.version) continue;
        const key = item.kind + ':' + item.key;
        const id = notificationIds.get(key) || ++sequence;
        try {
          await show(item.title, item.body, item.extra, 0, id);
          if (item.owner !== who() || item.generation !== accountGeneration || map.get(item.key) !== item.version) {
            await local.removeDeliveredNotifications({ notifications: [{ id }] });
          } else notificationIds.set(key, id);
        } catch (e) {
          const map = item.kind === 'chat' ? chatTimes : taskTimes;
          if (map.get(item.key) === item.version) map.delete(item.key);
          status('Android alert failed: ' + e.message);
        }
      }
    } catch (e) { status('Android notification check failed: ' + e.message); }
    finally { worker = false; }
  }
  window.addEventListener('erp333:notifications', e => {
    if (window.MMAFirebase613?.ownsEvents) return;
    const owner = who();
    if (!owner || e.detail?.type !== 'personal-unread') return;
    for (const c of e.detail.conversations || []) {
      const stamp = Date.parse(c.last_at || '');
      if (!Number.isFinite(stamp) || !c.id || !(Number(c.count) > 0)) continue;
      const kind = c.kind || 'direct';
      if (!['direct', 'group'].includes(kind)) continue;
      const key = owner + ':' + kind + ':' + c.id;
      const previous = chatTimes.get(key);
      if (previous === undefined && stamp < startTime) { chatTimes.set(key, stamp); continue; }
      if (previous !== undefined && stamp <= previous) continue;
      enqueue('chat', key, stamp, owner, (c.name || 'New message') + ' · MM Agency',
        c.count + ' unread message(s)', { type: 'chat', recipient_id: owner, kind, room_id: c.id });
    }
  });
  window.addEventListener('erp432:work-list', e => {
    if (window.MMAFirebase613?.ownsEvents) return;
    const owner = who(), employee = window.ERPEmployeeAuth?.employee;
    if (!owner || e.detail?.employee_id !== owner) return;
    if (!(window.MMAWork426?.right(employee, 'myWork') || window.MMAWork426?.right(employee, 'helperWork'))) return;
    for (const t of e.detail.tasks || []) {
      if (t.assignee_id !== owner || !t.id) continue;
      const key = owner + ':' + t.id;
      let seen = [];
      try { seen = JSON.parse(localStorage.getItem('mma_task_seen437:' + owner) || '[]'); } catch {}
      if (['Completed', 'Cancelled'].includes(t.work_status) || t.notification_opened || seen.some(pair => pair[0] === t.id)) {
        taskTimes.set(key, 'opened');
        void dismissTask(owner, t.id);
        continue;
      }
      // One notification per task until opened; title/status updates do not spam the phone.
      if (taskTimes.has(key)) continue;
      enqueue('task', key, 'notified', owner, 'MM Agency · Assigned Task',
        t.title || t.work_type || 'A task has been assigned to you.',
        { type: 'task', recipient_id: owner, task_id: t.id });
    }
  });
  async function dismissTask(owner, taskId) {
    const key = 'task:' + owner + ':' + taskId, id = notificationIds.get(key);
    if (id) {
      notificationIds.delete(key);
      try { await local.removeDeliveredNotifications({ notifications: [{ id }] }); } catch {}
    }
  }
  window.addEventListener('erp432:task-opened', e => {
    if (e.detail?.employee_id !== who()) return;
    taskTimes.set(who() + ':' + e.detail.id, 'opened');
    void dismissTask(who(), e.detail.id);
  });

  async function route() {
    if (!pendingRoute || opening || !who() || window.MMAStarting551 || document.getElementById('app')?.classList.contains('hide')) return;
    const data = pendingRoute;
    if (data.recipient_id !== who() || Number(data.expires_at) < Date.now()) {
      pendingRoute = null;
      status('Notification belongs to another login or has expired.');
      return;
    }
    opening = true;
    try {
      if (data.type === 'test') await window.MMAAppTab410?.('account');
      else if (data.type === 'task') {
        if (!window.MMATasks432?.openTask) return;
        await window.MMATasks432.openTask(data.task_id);
      } else if (data.type === 'chat') {
        if (!window.erp377ChatBridge?.openPush423) return;
        await window.MMAAppTab410?.('chat');
        if (data.recipient_id !== who()) return;
        await window.erp377ChatBridge.openPush423(data);
      }
      pendingRoute = null;
    } catch (e) { pendingRoute = null; status('Notification could not open: ' + e.message); }
    finally { opening = false; }
  }
  // Register immediately so taps that launch a cold app are queued until login is restored.
  if (local?.addListener) Promise.resolve().then(() => local.addListener('localNotificationActionPerformed', event => {
    pendingRoute = event.notification?.extra || null;
    void route();
  })).catch(e => status('Notification listener failed: ' + e.message));
  window.sb?.auth.onAuthStateChange(event => {
    accountGeneration++;
    queue.length = 0; chatTimes.clear(); taskTimes.clear(); notificationIds.clear();
    if (event === 'SIGNED_OUT') {
      pendingRoute = null;
      void local.cancel({ notifications: [{ id: 608001 }, { id: 608002 }] }).catch(() => {});
      void local.removeAllDeliveredNotifications().catch(() => {});
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void permission(false).catch(e => status(e.message));
  });
  setInterval(() => { void route(); }, 750);
  window.MMANativeNotifications608 = {
    enable, test,
    async receiveRemote(data = {}) {
      if (!await permission(false)) return false;
      const extra = {
        type: ['chat', 'task'].includes(data.type) ? data.type : 'test',
        recipient_id: String(data.recipient_id || who()),
        kind: data.kind === 'group' ? 'group' : 'direct',
        room_id: String(data.room_id || ''), task_id: String(data.task_id || '')
      };
      await show(data.type === 'test' ? 'MM Agency · Firebase Test' : 'MM Agency', data.type === 'test' ? 'Server se Firebase notification pahunch gayi.' : 'New message or scheduled update received. Open the app to view.', extra);
      return true;
    },
    openRemote(data = {}) {
      pendingRoute = { ...data, type: ['chat', 'task'].includes(data.type) ? data.type : 'test',
        recipient_id: String(data.recipient_id || who()), expires_at: Date.now() + 86400000 };
      void route();
    },
    get enabled() { return enabled; }
  };
  window.MMAChatPush423 = { get active() { return enabled; } };
  if (window.ERPTaskChat377) window.ERPTaskChat377.enableAlerts = enable;
  void permission(false).then(ok => status(ok ?
    'Android alerts allowed. Use Enable Notifications to connect Firebase.' :
    'Tap Enable Android Notifications, then allow the phone permission.')).catch(e => status(e.message));
})();
