// Refuse an APK without the correctly registered Firebase Android app.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const firebasePath = 'android/app/google-services.json';
assert.ok(fs.existsSync(firebasePath), 'Add Firebase google-services.json for com.mmatradelink.erp before building.');
const firebaseConfig = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
assert.ok(firebaseConfig.client?.some(c => c.client_info?.android_client_info?.package_name === 'com.mmatradelink.erp'), 'Firebase config must register com.mmatradelink.erp. Do not edit the old JSON package manually.');
if (!fs.existsSync('android')) execFileSync('npx',['cap','add','android'],{stdio:'inherit'});
execFileSync('npx',['cap','sync','android'],{stdio:'inherit'});
const manifest='android/app/src/main/AndroidManifest.xml';
let s=fs.readFileSync(manifest,'utf8');
for (const permission of ['CAMERA','RECORD_AUDIO','ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION']) {
 if (!s.includes('android.permission.'+permission)) s=s.replace('</manifest>',`<uses-permission android:name="android.permission.${permission}" /></manifest>`);
}
fs.writeFileSync(manifest,s);
const gradle='android/app/build.gradle';
s=fs.readFileSync(gradle,'utf8').replace(/versionCode \d+/, 'versionCode 647').replace(/versionName "[^"]+"/, 'versionName "6.47.0"');
fs.writeFileSync(gradle,s);
