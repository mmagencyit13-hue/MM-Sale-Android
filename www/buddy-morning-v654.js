(() => {
  'use strict';
  const format = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });
  function number(input) {
    if (input == null || input === '') return null;
    const n = Number(String(input).replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  function amounts(row) {
    const qty = number(row.qty);
    const unit = String(row.uom || row.unit || '').trim().toLowerCase();
    const pcs = /^(pc|pcs|piece|pieces)$/.test(unit);
    const sets = /^(set|sets)$/.test(unit);
    const mtr = /^(m|mtr|meters?|metres?)$/.test(unit);
    const classified = row.pcs != null || row.sets != null || row.mtr != null;
    return {
      pcs: number(row.pcs) ?? (pcs ? qty : null),
      sets: number(row.sets) ?? (sets ? qty : null),
      mtr: number(row.mtr) ?? (mtr ? qty : null),
      raw: !classified && !pcs && !sets && !mtr ? qty : null
    };
  }
  const display = (n, unit = '') => n == null ? '' : [format.format(n), unit].filter(Boolean).join(' ');
  const quantity = row => [display(row.pcs, 'पीस'), display(row.sets, 'सेट'), display(row.raw)].filter(Boolean).join(' + ') || '—';
  function sum(rows, key) {
    const values = rows.map(row => row[key]).filter(n => n != null);
    return values.length ? values.reduce((total, n) => total + n, 0) : null;
  }
  window.MMABuddyMorning654 = function (report) {
    const rows = Array.isArray(report.payload?.rows) ? report.payload.rows : [];
    const date = String(report.report_date || '').slice(0, 10).split('-').reverse().join('-');
    if (report.type === 'visitors') {
      return [
        '📅 Client Visit Schedule | ' + date,
        rows.length ? 'Kindly note that the following client visits are scheduled.' : 'No client visits are scheduled.',
        ...rows.map((row, index) => (index + 1) + '. ' + (row.name || '—') + ' — Assigned Executive: ' + (row.executive || '—')),
        '🖼️ Please see the attached image for the full schedule.',
        'Regards,\nMM Agency'
      ].join('\n\n');
    }
    if (report.type !== 'orders') return '';
    const counts = rows.map(amounts);
    const totals = Object.fromEntries(['pcs', 'sets', 'mtr', 'raw'].map(key => [key, sum(counts, key)]));
    return [
      '🙏 नमस्ते! सुप्रभात 🌞',
      '📋 आज के कुल ऑर्डर फॉर्म' + (date ? ' | रिपोर्ट दिनांक ' + date : ''),
      '📦 कुल Qty ' + quantity(totals) + '  |  📏 कुल Mtr ' + (display(totals.mtr, 'मीटर') || '—'),
      ['क्र. | नाम | ऑर्डर संख्या | Qty', ...rows.map((row, index) =>
        [index + 1, row.executive || row.employee_name || '—', row.order_count ?? '—', quantity(counts[index])].join(' | '))].join('\n'),
      '🖼️ पूरी रिपोर्ट साथ दी गई इमेज में देखें।',
      'सादर,\nMM Agency'
    ].join('\n\n');
  };
})();
