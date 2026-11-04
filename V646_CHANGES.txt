MMA Tradelink V646

1. Run backend/V646_DASHBOARD_GRAPH.sql once in Supabase SQL Editor for the new graph calculation. It is additive and does not edit transactions. The V644 diagnostic is NOT required for this update.
2. Replace repository files, commit and push. Run Build MMA Tradelink V646 APK.
3. Install as UPDATE over MMA Tradelink V644/V645. Do not uninstall the old software app. Package and signing key are unchanged from V644.

Changes:
- Single native keyboard/system-bar inset owner and measured chat viewport.
- Android 10+: save actual PDF bytes to Downloads/MMA Tradelink, publish only after the stream is closed. Android 9 and below: staged-file Save As fallback without large base64 Activity state. Cancel is not reported as success.
- Share Order PDF passes the generated PDF attachment to WhatsApp / WhatsApp Business. Some WhatsApp versions show a recipient picker. Choose the correct Buyer/Supplier, press Send, then return. Automatic sending/delivery confirmation is not claimed.
- Graph Sale = Sale Invoice + Ledger Sale; Receiving = Payment + Ledger Receipt. Server aggregates both monthly totals and graph bars from the same rows, with company/category/segment filters and separate previous-year comparisons.
- Total Entry retains creation-date logic; graph retains invoice/ledger/receipt date logic. Backdated entries and different date ranges can produce different amounts.
- Notification duplicate removal from V645 retained; automatic morning and server-notification diagnostics remain pending.

Validation: Existing automated suites and direct PDF share flow passed. Graph SQL executed in an isolated PostgreSQL-compatible test database with fixtures for source totals, day boundaries, authorization, category/company filters and fiscal comparisons. No live production data or physical phone results were verified for V646.
