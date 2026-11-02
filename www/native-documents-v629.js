/* Android file handling for authenticated blobs, without uploading private documents. */
(() => {
  'use strict';
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  const plugin = typeof cap.registerPlugin === 'function' ? cap.registerPlugin('MMADocuments') : cap.Plugins?.MMADocuments;
  const LIMIT = 25 * 1024 * 1024;
  function report(error) {
    if (error?.name === 'AbortError') return;
    const text = error?.message || 'Document operation failed. Please retry.';
    const target = document.getElementById('tcStatus') || document.getElementById('orderStatus');
    if (target) target.textContent = text;
    else window.alert(text);
  }
  async function transfer(blob, name, action = 'open') {
    if (!plugin?.[action]) throw Error('Install the updated MM Sale APK to open/save documents.');
    if (!blob?.size || blob.size > LIMIT) throw Error('Document must be between 1 byte and 25 MB.');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    const extension = ({'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg','text/plain':'txt'})[blob.type] || 'bin';
    const fileName = String(name || blob.name || ('MM_Document.' + extension)).replace(/[\\/\x00-\x1f]/g, '_');
    const mime = /\.pdf$/i.test(fileName) ? 'application/pdf' : blob.type || 'application/octet-stream';
    return plugin[action]({ base64: btoa(binary), name: fileName, mime });
  }
  async function fromUrl(href, name, action) {
    if (!/^(blob:|data:)/i.test(href)) throw Error('Document URL must be a prepared local file.');
    const response = await fetch(href);
    if (!response.ok) throw Error('Document is unavailable. Please open it again.');
    return transfer(await response.blob(), name, action);
  }
  window.MMADocuments629 = { transfer, fromUrl, report, openWhatsApp: url => plugin.openUrl({url}) };
  // Detached programmatic anchors do not reach document click listeners.
  const originalClick = HTMLAnchorElement.prototype.click;
  function local(anchor) { return /^(blob:|data:)/i.test(anchor.href || ''); }
  function activate(anchor) {
    void fromUrl(anchor.href, anchor.download || '', anchor.hasAttribute('download') ? 'save' : 'open').catch(report);
  }
  HTMLAnchorElement.prototype.click = function () {
    if (local(this)) { activate(this); return; }
    return originalClick.apply(this, arguments);
  };
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || !local(anchor)) return;
    event.preventDefault(); event.stopImmediatePropagation(); activate(anchor);
  }, true);
  const originalOpen = window.open;
  window.open = function (url, ...args) {
    const href = String(url || '');
    if (/^(blob:|data:)/i.test(href)) { void fromUrl(href, '', 'open').catch(report); return {opener:null}; }
    return originalOpen.call(this, url, ...args);
  };
})();
