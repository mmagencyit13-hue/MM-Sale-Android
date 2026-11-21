const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const startup = fs.readFileSync('www/login-required-v542.js', 'utf8');
const session = fs.readFileSync('www/session-v551.js', 'utf8');
const hour = 60 * 60 * 1000;
const tokenKey = 'mma_sales_employee_session_v1';
const activityKey = 'mma_activity551';
const start = Date.parse('2026-11-20T18:25:00Z');

function launch(last, now, handoff) {
    const stored = new Map([[tokenKey, 'current-session']]);
    if (last !== undefined) stored.set(activityKey, String(last));
    const window = { addEventListener() {} };
    const storage = {
        getItem: key => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
        removeItem: key => stored.delete(key)
    };
    const context = vm.createContext({
        window,
        parent: window,
        Date: { now: () => now },
        localStorage: storage,
        sessionStorage: {
            getItem: () => handoff ? JSON.stringify(handoff) : null,
            removeItem() {}
        },
        document: { addEventListener() {}, getElementById() { return null; } },
        navigator: {},
        setInterval() {},
        sb: { auth: { onAuthStateChange() {} } },
        ERPEmployeeAuth: {
            async logout() { stored.delete(tokenKey); }
        }
    });
    vm.runInContext(startup, context);
    vm.runInContext(session, context);
    return { context, stored, window };
}

assert.equal(launch(start, start + 8 * hour).stored.get(tokenKey), 'current-session');
assert.equal(launch(start, start + 96 * hour - 1).stored.get(tokenKey), 'current-session');
assert.equal(launch(start, start + 96 * hour).stored.has(tokenKey), false);
assert.equal(launch(undefined, start).stored.get(tokenKey), 'current-session');

const { context, stored, window } = launch(start, start + 8 * hour);
assert.equal(window.MMAActivity660.check(false), true);
context.Date.now = () => start + 96 * hour;
assert.equal(window.MMAActivity660.check(false), false);
assert.equal(stored.has(tokenKey), false);

const switchTime = start + 8 * hour;
const handoff = { token: 'current-session', at: switchTime - 10, activity: start };
assert.equal(launch(undefined, switchTime, handoff).stored.get(activityKey), String(start));
assert.equal(launch(undefined, switchTime, { ...handoff, token: 'different' }).stored.has(activityKey), false);
console.log('Android startup, resume and business handoff use the 96-hour session policy.');
