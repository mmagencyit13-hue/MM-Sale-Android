import { readFile } from 'node:fs/promises';

const token = process.env.MMA_SUPABASE_SERVICE_ROLE_KEY;
if (!token) throw Error('Set the MMA_SUPABASE_SERVICE_ROLE_KEY GitHub Actions secret.');
const gradle = await readFile('android/app/build.gradle', 'utf8');
const versionCode = Number(gradle.match(/^\s*versionCode\s+(\d+)\s*$/m)?.[1]);
const versionName = gradle.match(/^\s*versionName\s+"(\d+\.\d+\.\d+)"\s*$/m)?.[1];
if (!Number.isSafeInteger(versionCode) || versionCode < 687 || !versionName) throw Error('Invalid Android version.');
const base = 'https://vuogorddmdumjpquvuqz.supabase.co/storage/v1/object';
const auth = { apikey: token, Authorization: `Bearer ${token}` };
const object = '/mma-app-updates/latest.json';
const previous = await fetch(base + '/authenticated' + object, { headers: auth });
if (previous.ok) {
  const latest = await previous.json();
  if (!Number.isSafeInteger(latest.versionCode) || latest.versionCode >= versionCode) {
    throw Error('Increase Android versionCode before publishing.');
  }
} else {
  const error = await previous.json().catch(() => ({}));
  if (previous.status !== 404 && error.statusCode !== '404') throw Error(`Cannot check current release (${previous.status}).`);
}
async function put(path, type, body) {
  const response = await fetch(base + path, {
    method: 'POST', headers: { ...auth, 'Content-Type': type, 'x-upsert': 'true' }, body,
  });
  if (!response.ok) throw Error(`Update upload failed (${response.status}).`);
}
await put(`/mma-app-updates/MMA_Tradelink_V${versionCode}.apk`, 'application/vnd.android.package-archive',
  await readFile('android/app/build/outputs/apk/debug/app-debug.apk'));
await put(object, 'application/json', JSON.stringify({ versionCode, versionName }));
console.log(`Published Android version ${versionName} (${versionCode}).`);
