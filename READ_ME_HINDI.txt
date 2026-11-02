MM Sale APK V629 - Buddy Notifications / PDF / WhatsApp Links

Base: main-account setup source (V614 app). Desktop V627 unchanged.
Package: com.mmagency.sales | Firebase: mm-agency-7ca84
Public client links: https://mmasales.netlify.app/order-image.html#<token>

DEPLOY IN THIS ORDER:
1. Supabase SQL Editor: run ONLY backend/03_buddy_native_v629.sql once.
   Do not rerun backend/01_firebase.sql; it is retained original source only.
   The V629 script is repeatable. If schema preflight reports a mismatch, stop and send the error; changes roll back.
2. Supabase Edge Functions > mma-firebase-push > Code > index.ts:
   paste entire backend/mma-firebase-push-code.txt and Deploy updates.
   Keep existing JWT and secret configuration. index.ts and TXT contain identical code.
3. GitHub Desktop: select MM-Sale-Android. Show in Explorer.
   Copy this ZIP's extracted CONTENTS into that repository root, replacing matching files.
   Commit: V629 Buddy PDF and client link fixes. Push origin.
4. GitHub Actions > Build MM Sale V629 APK > Run workflow > main.
   Download MM-Sale-V629-APK artifact, extract app-debug.apk and install over the main-account setup app.
   No uninstall is required when updating that setup APK with its existing signing key.

CHANGES:
- Buddy morning orders / client visits events mirror into the existing FCM Android queue.
- Notification tap opens the logged-in employee's MM Buddy report; another employee's report cannot be opened.
- Foreground notifications have a Buddy title; background uses Firebase and the same Android channel.
- Android handles PDF/document open, save and share. Saving opens the phone's save-location picker; confirm Save there.
- Buddy report PDFs, signed commission files, submitted order PDFs and programmatic blob downloads use Android file handling.
- Review Order WhatsApp shares a public HTTPS mmasales.netlify.app image link, never localhost or an isolated token.
- The original hosted viewer and token expiry/permissions are reused. No Netlify deploy is required for this fix.

TEST TOGETHER AFTER INSTALL:
Enable Notifications once. Check Test Notification, morning Buddy order/visits alerts foreground/background/logged out; login to open report details.
Buddy PDF download: choose destination and Save; then Open PDF. Submitted Order: Open PDF and Share.
Review order: send generated image link to buyer/supplier, open it on another phone without the app.
WhatsApp Send is still manual; opening the chat does not claim delivery.

VALIDATION:
Local JavaScript/notification regression checks, mocked native transfer and link tests, embedded PostgreSQL migration/trigger/idempotency fixtures, and Capacitor Android sync.
Actual Supabase schema/deployment and physical device checks are still required. APK compilation happens in GitHub Actions; no local Android SDK was available.
This remains an internal setup/debug build using the setup signing configuration. Final production signing is a separate step before final distribution.
