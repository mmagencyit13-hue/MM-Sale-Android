(() => {
  'use strict';
  const money = new Intl.NumberFormat('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
  const rupees = value => '₹' + money.format(Number(value));
  const date = value => String(value).split('-').reverse().join('-');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

  function isSalesExecutive(role) {
    return /^sales?\s*executive\b/i.test(String(role || '').trim().replace(/[_-]+/g, ' '));
  }

  function create({scope, allowed, read, refresh, clearInput, status}) {
    let owner, mode = false, entries = [], serial = 0, pending = false;
    function reset() {
      owner = scope();
      mode = false;
      entries = [];
      serial++;
      pending = false;
    }
    function sync() {
      if (scope() !== owner || (!allowed() && (mode || entries.length))) reset();
    }
    async function add(prompt, payload) {
      entries.push({id:-(++serial), prompt, payload, created_at:new Date().toISOString()});
      await refresh();
    }
    function list(serverRows) {
      sync();
      return entries.length ? [...serverRows,...entries].sort((a,b) => Date.parse(a.created_at) - Date.parse(b.created_at)) : serverRows;
    }
    async function start() {
      sync();
      if (!allowed() || pending) return;
      mode = true;
      clearInput();
      await add('Supplier Outstanding', {
        kind:'flow', step:'name', service:'supplier-outstanding',
        text:'Type the supplier name (at least 4 letters), press Send, then select a match.'
      });
    }
    async function request(args, prompt, toPayload) {
      sync();
      if (!allowed() || !mode || pending) return;
      const context = owner;
      const before = serial;
      pending = true;
      status('Checking Supplier Outstanding…');
      try {
        const data = await read(args);
        if (context !== scope() || before !== serial || !allowed()) return;
        const payload = toPayload(data);
        clearInput();
        await add(prompt,payload);
        status('');
      } catch (error) {
        if (context === scope()) status(error.message || 'Supplier Outstanding could not load.');
      } finally {
        if (context === scope()) pending = false;
      }
    }
    async function send(text) {
      sync();
      if (!mode || !text) return false;
      if (/^(hi|hello|hey|hii+|namaste|help|services?|menu|options?)[.! ]*$/i.test(text)) {
        leave();
        return false;
      }
      if (Array.from(text).length < 4) {
        status('Type at least 4 letters of the supplier name.');
        return true;
      }
      await request({query:text},text,data => ({
        kind:'matches', service:'supplier-outstanding', rows:data.rows,
        text:data.rows.length ? 'Select the matching party' : 'No matching supplier. Try another name.'
      }));
      return true;
    }
    async function select(id) {
      sync();
      const match = entries.flatMap(entry => entry.payload.kind === 'matches' ? entry.payload.rows : []).find(row => String(row.id) === id);
      if (!match) return;
      await request({supplier_id:id},match.name,data => {
        if (!data.fy || data.opening == null || data.total_bills == null) throw Error('Run the V673 Supplier Outstanding SQL update first.');
        mode = false;
        return {kind:'supplier-outstanding-summary', data};
      });
    }
    function leave() {
      mode = false;
      if (pending) serial++;
      pending = false;
    }
    async function download(id) {
      sync();
      const data = entries.find(entry => String(entry.id) === id)?.payload.data;
      if (!allowed() || !data) return;
      const rows = data.rows.map(row => ({name:row.name, amount:Number(row.outstanding), outstandingDate:row.outstanding_date||row.last_received_date})).filter(row => Math.round(row.amount * 100) > 0);
      try {
        const blob = window.MMAOutstanding546.pdf({
          name:data.name, rows, positiveTotal:rows.reduce((total,row) => total + row.amount,0),
          total:Number(data.total), counterparty:'Buyer', asOf:date(data.as_of)
        });
        const filename = 'Outstanding_' + data.name.replace(/[^a-z0-9]+/gi,'_') + '.pdf';
        await window.MMABuddyDocuments679.choose(blob,filename);
      } catch (error) {
        status(error.message || 'PDF could not be downloaded.');
      }
    }
    return {start, list, send, select, leave, reset, download, active:()=>{sync();return mode;}};
  }

  function markup(data, id) {
    const last = data.last_received_date
      ? rupees(data.last_received_amount) + ' on ' + date(data.last_received_date)
      : '—';
    return `<div class="tcBody">${escape(data.name)}<br>Opening (FY ${escape(data.fy)}): ${rupees(data.opening)}<br>Total bills (FY ${escape(data.fy)}): ${rupees(data.total_bills)}<br><button type="button" class="outstanding546" data-buddy-supplier-pdf="${escape(id)}">Outstanding: ${rupees(data.total)} · Open / Download PDF</button><br>Last received: ${last}<br>Days since last received: ${escape(data.days_since_received ?? '—')}</div>`;
  }
  window.MMABuddyOutstanding673 = {isSalesExecutive, create, markup};
})();
