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
  function normalizeReport(report) {
    if (!report || !['orders','visitors'].includes(report.type) || !/^\d{4}-\d{2}-\d{2}$/.test(report.report_date || '')) return [];
    let payload = report.payload;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = null; }
    }
    const rows = Array.isArray(payload?.rows) ? payload.rows.filter(row => row && typeof row === 'object') : [];
    return [{...report, payload:{...payload, rows}}];
  }

  function reportImages(report) {
    const rows = report.payload.rows;
    const images = [];
    for (let offset = 0; offset < Math.max(1, rows.length); offset += 25) {
      images.push(reportImage(report, rows.slice(offset, offset + 25), offset));
    }
    return images;
  }

  function reportImage(report, rows, offset) {
    const visitor = report.type === 'visitors';
    const columns = visitor
      ? ['S.No','Client Name','City','Product','Contact No','Sales Person','Contact No']
      : ['S.No','Executive Name','Order Count','Qty'];
    const data = rows.map((row, index) => {
      const number = offset + index + 1;
      return visitor
        ? [number,row.name,row.city,row.product,row.contact,row.executive,row.executive_mobile]
        : [number,row.executive || row.employee_name,row.order_count,row.qty];
    });
    if (!visitor && offset + rows.length >= report.payload.rows.length) {
      const all = report.payload.rows;
      data.push(['','Total',all.reduce((sum, row) => sum + Number(row.order_count || 0), 0),all.reduce((sum, row) => sum + Number(row.qty || 0), 0)]);
    }
    const widths = visitor ? [65,400,180,190,205,230,230] : [90,510,250,250];
    const canvas = document.createElement('canvas');
    canvas.width = widths.reduce((sum, value) => sum + value, 0);
    const ctx = canvas.getContext('2d');
    ctx.font = '22px Arial';
    function wrap(value, maxWidth) {
      const lines = [];
      let line = '';
      for (const word of String(value ?? '-').split(/\s+/)) {
        const next = line ? line + ' ' + word : word;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
      return lines;
    }
    const prepared = [columns,...data].map(row => row.map((value, index) => wrap(value,widths[index]-18)));
    const heights = prepared.map(row => Math.max(48,...row.map(lines => lines.length * 29 + 18)));
    canvas.height = 170 + heights.reduce((sum, value) => sum + value, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#075e54';
    ctx.fillRect(0,0,canvas.width,80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Arial';
    const title = visitor ? 'Today Client Visitor' : 'Yesterday Order Count';
    ctx.fillText(title + ' · ' + report.report_date.split('-').reverse().join('-'),20,50);
    let y = 95;
    prepared.forEach((row, index) => {
      let x = 0;
      ctx.font = (index === 0 ? 'bold ' : '') + '22px Arial';
      row.forEach((lines, column) => {
        ctx.fillStyle = index === 0 ? '#e5e7eb' : '#fff';
        ctx.fillRect(x,y,widths[column],heights[index]);
        ctx.strokeStyle = '#111';
        ctx.strokeRect(x,y,widths[column],heights[index]);
        ctx.fillStyle = '#111';
        lines.forEach((line, lineIndex) => ctx.fillText(line,x+9,y+30+lineIndex*29,widths[column]-18));
        x += widths[column];
      });
      y += heights[index];
    });
    ctx.fillStyle = '#075e54';
    ctx.font = 'bold 23px Arial';
    ctx.fillText('Thanks, MM Buddy',20,y+46);
    return canvas.toDataURL('image/png');
  }

  window.MMABuddyMorningImages671 = {normalize:normalizeReport, images:reportImages};
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
