MMA Tradelink V648

INSTALL IN THIS ORDER
1. Supabase SQL Editor: run backend/V648_APP_UPDATE.sql. It installs the optimized graph and notification test changes. Existing transaction data is not edited.
2. Supabase Edge Functions > mma-firebase-push > Code: replace with backend/mma-firebase-push-code.txt and Deploy. Retain the existing secrets and existing verify_jwt=false setting. No new Firebase configuration is needed.
3. Replace GitHub repository source files, commit, push. Actions > Build MMA Tradelink V648 APK. Install as UPDATE without uninstalling.

DASHBOARD
Overview now bypasses the old full finance/aging/ranking query and calls the source aggregation directly. Typed amount/date fields and a no-master-join default path reduce work. Previous-year comparisons and existing opening/rollover rules are retained. No transaction data is changed.

NOTIFICATIONS
Enable stays disabled with Notifications Enabled only after the server confirms binding for the current login and FCM token. It unlocks after logout/account change or a failed binding. Repeated Enable clicks do not re-register a connected phone.
Test attempts an immediate server-side send through an exclusive lease on the user's own test job; an existing worker lease cannot be sent twice. Network/FCM delivery time is not guaranteed. The 30-second countdown is the gap between separate tests, not a timer delaying the first notification. Chat/task and morning workers remain unchanged.

WHATSAPP
This phone's WhatsApp ignores document EXTRA_TEXT captions. Use two explicit steps per recipient:
1. Share PDF: select the correct Buyer/Supplier and press Send in WhatsApp, then return.
2. Send Order Details: opens that recipient's chat with the prepared text. Press Send and return.
Text includes Order form / Supplier Name / Buyer Name / Qty / Dated / Executive name. No PDF link is sent as the details. The app does not automatically send or verify delivery. Both share steps must be opened before the existing order-submit flow becomes ready.

VALIDATION
Automated JS and isolated PostgreSQL-compatible checks cover totals, opening/rollover handling, date/category/company filters, role checks, targeted test leasing and no duplicate send, notification button state, and PDF-plus-separate-details flow. An isolated 100,000-extra-payment-row test validated the full total without paging truncation. Physical-phone and live-production verification remains required.
