import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
if (!fs.existsSync('android')) execFileSync('npx',['cap','add','android'],{stdio:'inherit'});
execFileSync('npx',['cap','sync','android'],{stdio:'inherit'});
const manifest='android/app/src/main/AndroidManifest.xml';
let s=fs.readFileSync(manifest,'utf8');
for (const permission of ['CAMERA','RECORD_AUDIO','ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION']) {
 if (!s.includes('android.permission.'+permission)) s=s.replace('</manifest>',`<uses-permission android:name="android.permission.${permission}" /></manifest>`);
}
fs.writeFileSync(manifest,s);
const gradle='android/app/build.gradle';
s=fs.readFileSync(gradle,'utf8').replace(/versionCode \d+/, 'versionCode 632').replace(/versionName "[^"]+"/, 'versionName "6.32.0"');
fs.writeFileSync(gradle,s);
