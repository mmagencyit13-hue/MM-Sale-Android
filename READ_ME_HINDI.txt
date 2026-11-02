MM Sale - Main account setup build

Base: working V614 APK source. Desktop V627 not merged or modified.
Firebase: mm-agency-7ca84
Package: com.mmagency.sales
App label: MM Sale
Supabase endpoint retained: vuogorddmdumjpquvuqz.supabase.co
Confirm this is your main ERP Supabase project before distributing.

Upload extracted folders and files to repository root, not the ZIP or parent folder.
Required root entries: android, www, scripts, tests, backend, test-signing, package.json, package-lock.json, capacitor.config.json.
If .github is not uploaded: use Add file > Create new file; name .github/workflows/android.yml; paste GITHUB_WORKFLOW.txt.
Actions > Build MM Sale Main Account Setup APK > Run workflow.
Download MM-Sale-Main-Account-Setup-APK artifact after success.

This is a DEBUG APK for main-account connection testing, using the existing public test signing key. It is not a final production-signed release. Do not distribute to the team as final.
Final release signing must be configured before team distribution.
Never upload Firebase service-account private JSON keys. Only google-services.json is included.
Backend already deployed separately: do not rerun bundled SQL during account setup.
Test foreground/background notifications, logout, login, back button and second-device login on a physical phone.
