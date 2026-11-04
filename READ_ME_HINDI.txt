MMA Tradelink V647

1. Run backend/V647_APP_UPDATE.sql once in Supabase SQL Editor. It includes the V646 graph setup plus explicit notification-test cooldown responses. No transaction entries are edited. No new Firebase config or Edge Function deployment is required for this change.
2. Replace repository files, commit and push. Build MMA Tradelink V647 APK and install as an UPDATE. Same package/signing key as V644 onwards.

Order PDF sharing now sends this text with the generated PDF:
Order form
Supplier Name- supplier name
Buyer Name- buyer name
Qty- total quantity (separate totals for different units)
Dated- order date in DD-MM-YYYY
Executive name- logged-in user who filled the order

WhatsApp may show its recipient picker; choose the correct buyer/supplier, then press Send and return. Caption presentation depends on WhatsApp version. The app does not claim automatic delivery.

Test Notification has a 30-second countdown. Earlier server-side 30-second throttling produced a generic error; the SQL now returns a specific cooldown or registration-needed response. The app ignores stale status polls and does not pretend that a rejected test was queued. Other server/network/configuration errors still require actual diagnosis.

Graph uses V646 calculation. If the setup SQL had not been run, this combined SQL installs it. If graph still fails, send the exact graph error screenshot and SQL result; production failure cause has not been confirmed. Total Entry remains creation-date based; graph uses invoice/ledger/receipt dates.

V646 chat/PDF save fixes retained. Automatic morning notification diagnostics remain pending. Automated JS suites and isolated PostgreSQL-compatible tests passed; physical phone verification remains required.
