MM Sale APK V632 — final approved app source

Is ZIP mein compiled APK nahi hai. Is source ko GitHub Actions se build karein.

1. GitHub Desktop mein MM-Sale-Android repository select karein. Show in Explorer.
2. ZIP extract karein. Iske andar ke files/folders repository root mein copy/replace karein. .github, android, www, scripts, package.json sab root mein hone chahiye. .git folder ko na badlein.
3. GitHub Desktop mein Summary: MM Sale V632 final approved changes. Commit to main, phir Push origin.
4. GitHub website: Actions → Build MM Sale V632 APK → Run workflow → main → Run workflow.
5. Green success ke baad run kholein. Artifacts se MM-Sale-V632-APK download karein, extract karke app-debug.apk install karein.

Same main package com.mmagency.sales, Firebase mm-agency-7ca84 aur same existing test signing key retained. Version 6.32.0 / code 632.

Included: approved Saturday dashboard Sale click, commission graph and right notification; V630-V632 Owner/Executive improvements; native Buddy morning report notification route; order PDF open/save; public mmasales WhatsApp image links; Back button login/draft preservation; PDF open/download/share controls.

V632 SQL and V629 Buddy SQL/Edge already installed ho toh dubara run/deploy ki zaroorat nahi. Backend folder reference ke liye hai. Netlify desktop deploy nahi karna.

Local validation: native notification, Back, Firebase, Edge and file/link tests pass; Capacitor Android sync pass; approved V632 source comparison pass. This environment has Java 17 and no Android SDK, so no Gradle APK compile or real-phone validation was performed here. GitHub workflow uses Java 21 and Android SDK.
