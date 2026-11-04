MMA Tradelink V653 — FY overview separated from current entry summary

1. Run backend/V653_FY_OVERVIEW.sql once in Supabase SQL Editor.
2. Replace repository files, commit and push. Build MMA Tradelink V653 APK and install as UPDATE. No Firebase/Edge Function update is required.

TOP ENTRY SUMMARY
The existing three cards remain Total Entry, Sale and Receiving. The top calendar and current selected Entry Date range are retained. Invoice/Payment created_at and parent Ledger created_at are used. Sale = Invoice + Ledger Sale; Receiving = Payment + Ledger Receipt/Payment. Total Entry counts original saved entries once.

LOWER FINANCIAL OVERVIEW
The lower Total Sale/Receiving cards and Sale & Receiving graph follow Financial Year / Period / Company / category filters independently. This FY 2026-27 uses the FY financial dates: invoice bill date (fallback invoice date), ledger line/header date, and payment receipt date. Opening/return/discount source rules and the existing Order Form graph are retained. Changing the top entry calendar does not change the selected FY or lower overview range.

The optimized aggregation supports explicit entry and transaction date bases; older callers default to entry so header behavior is preserved. Overview requests transaction, top summary requests entry. No displayed production amount is hardcoded.

Automated JS and isolated PostgreSQL-compatible tests verify backdated imports in the entry summary, exclusion from a different FY in the financial overview, correct monthly financial buckets and independent date scopes. The exact amounts visible in the user's reference screenshot require live data verification after deployment.

V652 attendance notice removal/native location request and the single PDF share flow are retained.
