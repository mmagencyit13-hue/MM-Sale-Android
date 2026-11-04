MMA Tradelink V644 — Firebase config integrated; Android build and device verification pending.

1. Firebase project mm-agency-7ca84 configuration is already integrated.
   Android package: com.mmatradelink.erp
   App name: MMA Tradelink
2. No further Firebase JSON replacement is required.
3. Use .github/workflows/android.yml to build after configuration is added.
4. This is a separate application from com.mmagency.sales. Retain the same signing key for subsequent updates to this new package.
5. Native window insets keep the app below the status bar/cutout and above navigation/keyboard.
6. Existing native notification tests pass, but automatic morning delivery has NOT yet been verified on a device.
7. Run V644_DIAGNOSTIC.txt in Supabase SQL Editor and return exported results to diagnose morning jobs and graph calculation.
8. Total Entry uses created_at in India time; financial graphs use backend report functions. Do not equate these totals without matching dates and filters.

This source continues APK V632. Desktop V643 remains separate and unchanged. No deployment has been performed.
