(() => {
  'use strict';

  async function choose(blob, name, openImage) {
    const image = blob.type.startsWith('image/');
    const media = window.MMAMedia48;
    if (!image && media?.open) return media.open(blob, name);

    const dialog = document.createElement('dialog');
    dialog.className = 'pdfPreview632';
    dialog.innerHTML = '<header><b></b><button type="button" data-close aria-label="Close">×</button></header><div><button type="button" data-open></button><button type="button" data-download></button></div><p role="status"></p>';
    const kind = image ? 'Image' : 'PDF';
    const status = dialog.querySelector('[role="status"]');
    const open = dialog.querySelector('[data-open]');
    const download = dialog.querySelector('[data-download]');
    dialog.querySelector('b').textContent = name;
    open.textContent = 'Open ' + kind;
    download.textContent = 'Download ' + kind;
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.onclose = () => dialog.remove();

    async function run(button, action) {
      button.disabled = true;
      status.textContent = '';
      try {
        await action();
      } catch (error) {
        if (error.name !== 'AbortError') status.textContent = error.message || 'Unable to process this file.';
      } finally {
        button.disabled = false;
      }
    }
    open.onclick = () => run(open, async () => {
      if (image && openImage) {
        dialog.close();
        return openImage();
      }
      if (window.MMADocuments629) return window.MMADocuments629.transfer(blob, name, 'open');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
    download.onclick = () => run(download, async () => {
      if (media?.save) return media.save(blob, name);
      await window.MMAPartyExport671.save(blob, name);
    });
    document.body.append(dialog);
    dialog.showModal();
  }

  function outstandingPDF(blob, name) {
    if (!blob?.size) throw Error('Outstanding PDF is empty. Please retry.');
    const url = URL.createObjectURL(blob);
    const dialog = document.createElement('dialog');
    dialog.className = 'pdfPreview632';
    dialog.innerHTML = '<header><b></b><button type="button" data-close aria-label="Close">×</button></header><iframe title="PDF preview"></iframe><div><a data-open target="_blank" rel="noopener">Open PDF</a> <a data-download>Download PDF</a></div><p role="status"></p>';
    dialog.querySelector('b').textContent = name;
    const open = dialog.querySelector('[data-open]');
    const download = dialog.querySelector('[data-download]');
    open.href = download.href = url;
    download.download = name;
    const native = window.MMADocuments629;
    if (native) {
      dialog.querySelector('iframe').hidden = true;
      for (const [link, action] of [[open, 'open'], [download, 'save']]) {
        link.addEventListener('click', async event => {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (link.dataset.busy) return;
          link.dataset.busy = 'true';
          const status = dialog.querySelector('[role="status"]');
          status.textContent = '';
          try {
            await native.transfer(blob, name, action);
          } catch (error) {
            if (error.name !== 'AbortError') status.textContent = error.message || 'Unable to process the PDF.';
          } finally {
            delete link.dataset.busy;
          }
        });
      }
    } else {
      dialog.querySelector('iframe').src = url;
    }
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.onclose = () => {
      dialog.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    };
    document.body.append(dialog);
    dialog.showModal();
  }

  async function image(url, name, preview) {
    const result = await fetch(url);
    if (!result.ok) throw Error('Image is unavailable. Please open it again.');
    return choose(await result.blob(), name, preview);
  }

  window.MMABuddyDocuments679 = {choose, image, outstandingPDF};
})();
