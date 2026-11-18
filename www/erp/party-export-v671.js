(() => {
  'use strict';
  const cleanName = name => name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().slice(0, 150) || 'Party';
  const xml = value => String(value ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/g, '').replace(/[&<>]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;'}[c]));
  const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  async function excel(columns, rows) {
    const zip = new window.JSZip();
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    const relationships = (type, target) => '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + type + '" Target="' + target + '"/></Relationships>';
    zip.file('_rels/.rels', relationships('officeDocument', 'xl/workbook.xml'));
    zip.file('xl/_rels/workbook.xml.rels', relationships('worksheet', 'worksheets/sheet1.xml'));
    zip.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Linked Parties" sheetId="1" r:id="rId1"/></sheets></workbook>');
    const content = [columns, ...rows].map(row => '<row>' + row.map(value =>
      typeof value === 'number' && Number.isFinite(value) ? '<c><v>' + value + '</v></c>' :
      '<c t="inlineStr"><is><t xml:space="preserve">' + xml(value) + '</t></is></c>').join('') + '</row>').join('');
    zip.file('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="' + columns.length + '" width="22" customWidth="1"/></cols><sheetData>' + content + '</sheetData></worksheet>');
    return zip.generateAsync({type:'blob', mimeType:mime, compression:'DEFLATE'});
  }

  async function pdf(title, subtitle, columns, rows) {
    const doc = new window.jspdf.jsPDF({orientation:'landscape', unit:'mm', format:'a4'});
    let font = 'helvetica';
    try {
      const response = await fetch('DejaVuSans.ttf');
      if (response.ok) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
        doc.addFileToVFS('DejaVuSans.ttf', btoa(binary));
        doc.addFont('DejaVuSans.ttf', 'PartyReport', 'normal');
        font = 'PartyReport';
      }
    } catch {}
    doc.setFont(font);
    const margin = 10;
    const width = doc.internal.pageSize.getWidth() - 2 * margin;
    const bottom = doc.internal.pageSize.getHeight() - margin;
    const wide = columns.map((_, index) => index === 1 ? 2.5 : index === 0 ? 0.55 : 1);
    const weights = wide.reduce((sum, value) => sum + value, 0);
    const widths = wide.map(value => width * value / weights);
    let y;
    function row(values, header = false) {
      doc.setFontSize(8);
      const lines = columns.map((_, index) => doc.splitTextToSize(String(values[index] ?? ''), widths[index] - 4));
      const height = Math.max(8, ...lines.map(items => items.length * 3.6 + 3));
      if (!header && y + height > bottom) {
        doc.addPage();
        heading();
      }
      let x = margin;
      for (let i = 0; i < lines.length; i++) {
        doc.setFillColor(230, 240, 237);
        doc.rect(x, y, widths[i], height, header ? 'FD' : 'S');
        doc.text(lines[i], x + 2, y + 4, {lineHeightFactor:1.27});
        x += widths[i];
      }
      y += height;
    }
    function heading() {
      doc.setFontSize(14);
      const titleLines = doc.splitTextToSize(title, width);
      doc.text(titleLines, margin, 14);
      y = 17 + titleLines.length * 5;
      doc.setFontSize(9);
      if (subtitle) {
        const subtitleLines = doc.splitTextToSize(subtitle, width);
        doc.text(subtitleLines, margin, y);
        y += subtitleLines.length * 4 + 2;
      }
      row(columns, true);
    }
    heading();
    rows.forEach(values => row(values));
    return doc.output('blob');
  }

  async function save(blob, name) {
    if (window.MMADocuments629) return window.MMADocuments629.transfer(blob, name, 'save');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function choose(getReport) {
    const report = getReport();
    if (!report.rows.length) return alert('No linked parties to export.');
    const dialog = document.createElement('dialog');
    dialog.className = 'partyExport671';
    dialog.innerHTML = '<h3>Export linked parties</h3><div><button type="button" data-format="pdf">PDF</button> <button type="button" data-format="excel">Excel</button> <button type="button" data-cancel>Cancel</button></div><p role="status"></p>';
    const status = dialog.querySelector('[role="status"]');
    const buttons = dialog.querySelectorAll('button');
    dialog.addEventListener('close', () => dialog.remove(), {once:true});
    dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', async event => {
      const format = event.target.closest('button[data-format]')?.dataset.format;
      if (!['pdf','excel'].includes(format)) return;
      buttons.forEach(button => button.disabled = true);
      status.textContent = 'Preparing export…';
      try {
        const {title, subtitle, columns, rows} = report;
        const blob = format === 'pdf' ? await pdf(title, subtitle, columns, rows) : await excel(columns, rows);
        await save(blob, cleanName(title) + (format === 'pdf' ? '.pdf' : '.xlsx'));
        if (dialog.open) dialog.close();
      } catch (error) {
        status.textContent = error.message || 'Export failed. Please retry.';
        buttons.forEach(button => button.disabled = false);
      }
    });
    document.body.append(dialog);
    dialog.showModal();
  }

  window.MMAPartyExport671 = {choose, excel, pdf, save};
  const detail = document.getElementById('partyDetail');
  if (!detail) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'light';
  button.textContent = 'Export';
  detail.querySelector('.filters').append(button);
  button.addEventListener('click', () => choose(() => {
    const body = document.getElementById('detailRows');
    const table = body.closest('table');
    const cells = Array.from(table.tHead.rows[0].cells);
    const exportable = cells.map((cell, index) => ({cell, index}))
      .filter(({cell}) => cell.textContent.trim() !== 'Ledger' && cell.getClientRects().length);
    return {
      title: document.getElementById('detailTitle').textContent.trim() + ' - ' + document.getElementById('detailRelatedTitle').textContent.trim(),
      subtitle: document.getElementById('detailSub').textContent.trim(),
      columns: exportable.map(({cell}) => cell.textContent.trim()),
      rows: Array.from(body.rows).filter(row => !row.hidden && row.getClientRects().length && row.cells.length === cells.length)
        .map(row => exportable.map(({index}) => row.cells[index].textContent.trim()))
    };
  }));
})();
