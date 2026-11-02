(() => {
 'use strict';
 function image(token, grey = false) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token || '')) throw Error('Order image link was not created. Please retry.');
  const native = window.Capacitor?.isNativePlatform?.();
  const base = native ? window.MMA_CONFIG?.publicSiteUrl : location.href;
  if (!base) throw Error('Public order image website is not configured.');
  const url = new URL('order-image.html', base);
  if (native && (url.protocol !== 'https:' || ['localhost','127.0.0.1','0.0.0.0','::1','[::1]'].includes(url.hostname))) throw Error('Order links require the public HTTPS website.');
  if (grey) url.searchParams.set('business','grey');
  url.hash = token;
  return url.href;
 }
 window.MMAOrderLinks629 = { image };
})();
