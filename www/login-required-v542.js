(() => {
    'use strict';

    const key = 'mma_activity551';
    const limit = 96 * 60 * 60 * 1000;
    const expired = (last, now = Date.now()) => last > 0 && now - last >= limit;
    window.MMASession551 = { key, limit, expired };

    let internal = false;
    try {
        internal = parent !== window && parent.location.origin === location.origin
            && !!parent.ERPEmployeeAuth?.employee;
    } catch {}
    if (internal) return;

    const now = Date.now();
    try {
        const handoff = JSON.parse(sessionStorage.getItem('mma_switch569') || 'null');
        sessionStorage.removeItem('mma_switch569');
        const token = localStorage.getItem('mma_sales_employee_session_v1');
        if (handoff && token && handoff.token === token
            && now - handoff.at >= 0 && now - handoff.at < 30000
            && handoff.activity > 0 && handoff.activity <= now && !expired(handoff.activity, now)) {
            const current = Number(localStorage.getItem(key));
            if (!(current >= handoff.activity && current <= now)) {
                localStorage.setItem(key, String(handoff.activity));
            }
        }
    } catch {}

    if (expired(Number(localStorage.getItem(key)), now)) {
        for (const name of ['mma_employee_session_v332', 'mma_employee_profile_v358',
            'mma_sales_employee_session_v1', 'mma_mobile_profile_v410']) {
            localStorage.removeItem(name);
        }
    }
})();
