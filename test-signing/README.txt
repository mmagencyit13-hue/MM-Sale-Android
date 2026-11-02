PUBLIC TEST-ONLY DEBUG SIGNING KEY
Password android; alias androiddebugkey. This key is NOT a production secret.
Keep it in this TEST project for repeatable test APK upgrades. Do not use it
for official/team release signing. Production needs a separately retained
private keystore, stored outside source control.
V610 uses new app ID com.mmagency.sales.notifytest; existing installed V609
was signed by an unavailable ephemeral CI key and cannot be upgraded with
this different key. V610 installs alongside it; no uninstall required.
