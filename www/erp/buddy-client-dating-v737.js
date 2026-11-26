(() => {
  'use strict';
  const today = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const displayDate = value => value.split('-').reverse().join('-');
  const getAuth = () => window.ERPEmployeeAuth;
  const request = (action, args) => getAuth().clientDating735(action, args);
  const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const signature = row => JSON.stringify([normalize(row.name), normalize(row.executive)]);
  let reportCache;

  function mergeReport(reports, visits) {
    if (!visits.rows.length) return reports;
    const old = reports.find(report => report.type === 'visitors' && report.report_date === visits.date);
    const rows = [...(old?.payload?.rows || [])];
    for (const visit of visits.rows) {
      const match = rows.findIndex(row => (row.visit_id || row.service_client_date_id)
        ? (row.visit_id || row.service_client_date_id) === visit.id && signature(row) === signature(visit)
        : signature(row) === signature(visit) && (!row.city || normalize(row.city) === normalize(visit.city)));
      if (match !== -1) rows.splice(match, 1);
    }
    rows.push(...visits.rows.filter(row => !row.cancelled));
    const merged = reports.filter(report => report !== old);
    if (rows.length) {
      const report = {...old, type: 'visitors', report_date: visits.date, payload: {...old?.payload, rows}};
      merged.splice(old ? reports.indexOf(old) : merged.length, 0, report);
    }
    return merged;
  }

  async function reportsForBuddy(reports, owner) {
    const day = today();
    try {
      if (reportCache?.owner !== owner || reportCache.day !== day || reportCache.until <= Date.now()) {
        reportCache = {owner, day, until: Date.now() + 30_000, pending: request('report')};
      }
      const visits = await reportCache.pending;
      return mergeReport(reports, visits);
    } catch {
      return reports;
    }
  }

  function install(bridge, refresh) {
    const dialog = document.createElement('dialog');
    dialog.className = 'buddyClientDating735';
    dialog.style.cssText = 'width:min(520px,92vw);max-height:85dvh;box-sizing:border-box;border:0;border-radius:14px;padding:16px;color:#182533';
    document.body.append(dialog);
    let owner, opening = 0, saving = false;
    const employee = () => Boolean(getAuth()?.isEmployee && bridge.user);
    function sync() {
      const hidden = !bridge.active || !employee();
      if (dialog.open && (hidden || owner !== bridge.user?.id)) dialog.close();
    }
    new MutationObserver(sync).observe(bridge.panel, {attributes:true, subtree:true, childList:true});
    dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
    dialog.addEventListener('close', () => { opening++; saving = false; dialog.replaceChildren(); });
    sync();

    function open(title) {
      owner = bridge.user.id;
      opening++;
      dialog.innerHTML = '<header style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h3></h3><button type="button" data-close aria-label="Close">×</button></header><div data-content></div><p data-feedback role="status" aria-live="polite"></p>';
      dialog.querySelector('h3').textContent = title;
      dialog.querySelector('[data-close]').onclick = () => { if (!saving) dialog.close(); };
      if (!dialog.open) dialog.showModal();
      return dialog.querySelector('[data-content]');
    }
    const feedback = text => {
      const status = dialog.querySelector('[data-feedback]');
      if (status) status.textContent = text;
    };
    const current = generation => dialog.open && generation === opening && owner === bridge.user?.id;
    function changed() {
      reportCache = null;
      void refresh().catch(() => {});
    }

    function buyerSearch(form) {
      const input = form.querySelector('[name=buyer]');
      const list = form.querySelector('[data-results=buyer]');
      let selected, timer, revision = 0;
      function load() {
        clearTimeout(timer);
        const generation = opening, version = ++revision, query = input.value;
        list.textContent = 'Searching…';
        timer = setTimeout(async () => {
          try {
            const matches = await request('buyers', {query});
            if (!current(generation) || version !== revision) return;
            list.replaceChildren();
            for (const party of matches) {
              const option = document.createElement('button');
              option.type = 'button';
              option.style.cssText = 'display:block;width:100%;text-align:left;margin:3px 0';
              option.textContent = [party.name, party.city, party.code].filter(Boolean).join(' · ');
              option.onclick = () => {
                selected = party;
                input.value = party.name;
                list.replaceChildren();
              };
              list.append(option);
            }
            if (!matches.length) list.textContent = 'No matching parties.';
          } catch (error) {
            if (current(generation) && version === revision) list.textContent = error.message;
          }
        }, 250);
      }
      input.addEventListener('focus', () => { if (!selected) load(); });
      input.addEventListener('input', () => { selected = null; load(); });
      return () => selected;
    }

    function showForm() {
      const content = open('📅 Client Dating');
      content.innerHTML = '<form><p>Select a buyer and a visiting date.</p><label style="display:block;margin-bottom:12px">Buyer Name<input type="search" name="buyer" placeholder="Search buyers" autocomplete="off" maxlength="120"><div data-results="buyer" style="max-height:135px;overflow:auto"></div></label><label style="display:block;margin-bottom:12px">Visiting Date *<input type="date" name="date" required></label><button type="submit">Save Client Dating</button></form>';
      const form = content.querySelector('form');
      const date = form.elements.namedItem('date');
      date.min = today();
      date.addEventListener('focus', () => { date.min = today(); });
      const buyer = buyerSearch(form);
      const submit = form.querySelector('[type=submit]');
      let lastDetails, requestId;
      form.onsubmit = async event => {
        event.preventDefault();
        if (saving) return;
        const selectedBuyer = buyer();
        if (!selectedBuyer) {
          feedback('Choose a buyer from the search results.');
          return;
        }
        if (!date.value || date.value < today()) { feedback('Choose today or a later visiting date.'); return; }
        const details = {buyer_id:selectedBuyer.id, visiting_date:date.value};
        const signature = JSON.stringify(details);
        if (signature !== lastDetails) { requestId = crypto.randomUUID(); lastDetails = signature; }
        const generation = opening;
        saving = true;
        for (const control of form.elements) control.disabled = true;
        feedback('Saving…');
        try {
          const result = await request('save', {id:requestId,...details});
          if (!current(generation)) return;
          const party = selectedBuyer.name;
          content.replaceChildren();
          feedback('✅ Saved · ' + party + ' · ' + displayDate(details.visiting_date) + ' · ' + result.executive);
          changed();
        } catch (error) {
          if (current(generation)) feedback(error.message);
        } finally {
          if (current(generation)) {
            saving = false;
            for (const control of form.elements) control.disabled = false;
          }
        }
      };
    }

    async function showList() {
      const content = open('❌ Client Cancel');
      const generation = opening;
      feedback('Loading your upcoming visits…');
      try {
        const visits = await request('list');
        if (!current(generation)) return;
        feedback(visits.length ? '' : 'You have no upcoming visits.');
        for (const visit of visits) {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #e2e8f0';
          const label = document.createElement('span');
          const party = visit.buyer || 'Buyer unavailable';
          label.textContent = displayDate(visit.date) + ' · ' + party;
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = '❌ Cancel';
          const cancelled = () => {
            const status = document.createElement('strong');
            status.style.color = '#b91c1c';
            status.textContent = '❌ Cancelled';
            button.replaceWith(status);
          };
          row.append(label,button);
          if (visit.cancelled) cancelled();
          button.onclick = async () => {
            if (saving || !window.confirm('Cancel the visit for ' + party + ' on ' + displayDate(visit.date) + '?')) return;
            saving = true;
            button.disabled = true;
            try {
              await request('cancel', {id:visit.id});
              if (!current(generation)) return;
              cancelled();
              feedback('Visit cancelled.');
              changed();
            } catch (error) {
              if (current(generation)) feedback(error.message);
            } finally {
              if (current(generation)) { saving = false; button.disabled = false; }
            }
          };
          content.append(row);
        }
      } catch (error) {
        if (current(generation)) feedback(error.message);
      }
    }

    bridge.panel.addEventListener('click', event => {
      const action = event.target.closest('[data-visit]')?.dataset.visit;
      if (!action || !bridge.active || !employee()) return;
      event.stopImmediatePropagation();
      if (action === 'new') showForm();
      if (action === 'list') void showList();
    },true);
  }

  window.MMABuddyClientDating735 = {install,reportsForBuddy, buttons:()=>getAuth()?.isEmployee ? '<button type="button" data-visit="new">📅 Client Dating</button><button type="button" data-visit="list">❌ Client Cancel</button>' : ''};
})();
