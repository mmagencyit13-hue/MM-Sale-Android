MMA Tradelink V651 — combined entry header and graph

1. Run backend/V651_COMBINED_ENTRIES_GRAPH.sql in Supabase SQL Editor.
2. Replace repository files, commit and push. Build MMA Tradelink V651 APK and install as UPDATE.
3. No Firebase/Edge Function update is needed for this version. Desktop V650 export remains separate.

Sale Invoice column = Sale Invoice amount/count + Ledger Sale amount/count.
Payment column = Payment amount/count + Ledger Receipt/Payment amount/count.
Ledger (All) is the full raw ledger reference; its Sale/Receipt portions are already included in the combined columns.
Total Entry remains the sum/count of unique original Invoice, Payment and Ledger entries, without adding a Ledger parent twice. Do not add Ledger (All) to the two combined columns again.

Amounts are classified using saved Voucher Type first; Particular is fallback only when Voucher Type is blank. Counts for ledger categories use distinct parent ledger entries, so multiple matching lines do not inflate a category count. A mixed-voucher parent can contribute to both category counts; Total Entry counts it once.

Monthly graph Sale = Invoice + Ledger Sale; Receiving = Payment + Ledger Receipt/Payment. All dates use India-time created_at, with ledger lines using the parent entry created_at. Header and graph invoke the same source aggregation for their requested date ranges, company/category and segment. Compare matching periods/filters.

Verification fixtures reproduce the supplied amounts: Payment 20,722,129 plus Ledger Receipt/Payment 4,039,105 = 24,761,234; Sale count 15 + 87 = 102. A synthetic 354-entry dataset tests raw grand-total de-duplication and matching graph/header amounts. The exact production sale-invoice amount was not supplied (9.8L was rounded), so the synthetic invoice total is not a claim about production data. Physical-phone/live-data verification remains pending.

Single Share PDF flow from V649 is retained. No separate details-message step or explanatory line was added.
