MMA Tradelink V652 — three matching dashboard cards + attendance location

Update repository files, commit and push. Build MMA Tradelink V652 APK and install as UPDATE.
No additional SQL or Edge/Firebase deployment is required if V651_COMBINED_ENTRIES_GRAPH.sql is already installed (the previous dashboard screenshot confirms combined header data was available).

DASHBOARD
Only Total Entry, Sale and Receiving remain at the top.
Total Entry is the amount/count of all original Invoice, Payment and Ledger entries, including ledger returns, discounts and other voucher types, counted once per saved parent entry.
Sale = Invoice + Ledger Sale. Receiving = Payment + Ledger Receipt/Payment. Each shows amount and smaller count in parentheses.
The entire overview (top cards, lower Sale/Receiving totals, monthly Sale/Receiving graph) now uses ONE selected date range and ONE financial source response. It no longer mixes a short top-card range with full-FY graph totals.
Default is Yesterday. Total Entry calendar applies the selected dates to the whole overview. Selecting This FY / This Month / Today also updates all overview figures together. Company/category filters remain shared. Every financial bucket uses Entry Date (India-time created_at; ledger lines inherit parent creation date).
Opening, Sale Return/Discount calculations and the Order Form graph are retained. Total Orders has its existing independent order-date controls.

ATTENDANCE
Removed the requested checked-in duty location notice from the form.
Allow Location / Retry now routes to the installed native Geolocation controller, which can show Android's system location-enable resolution dialog, request app permission and return live coordinates after user consent. It does not silently toggle system Location. Browsers retain their existing browser permission flow. GPS/system consent cancelled or permission denied remains an error; check-in cannot fabricate coordinates.

Automated checks validate single-source dashboard totals/range, exactly three summary cards, native location bridge selection and removal of the notice. Physical-phone testing of the system location dialog remains required. V649 single-PDF share behavior is retained.
