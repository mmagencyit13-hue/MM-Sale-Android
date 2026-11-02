/* Same one-line-per-entry layout as Add Ledger, with stable references and retry IDs. */
async function saveLedgerLines579(rows){
 const form=document.getElementById('ledgerFormEl'),editId=document.getElementById('ledgerId').value;
 const base=document.getElementById('ledgerRef').value.trim(),existing=LE.find(x=>x.id===editId);
 const shared={buyer_id:document.getElementById('ledgerBuyer').value,supplier_id:document.getElementById('ledgerSupplier').value,entry_date:document.getElementById('ledgerEntryDate').value,source:existing?.source||'MANUAL'};
 const lines=rows.map((row,i)=>{const val=css=>row.querySelector(css).value,side=val('.letype'),amount=Number(val('.leamt'));if(!val('.ledate')||!val('.leamt').trim()||!Number.isFinite(amount)||amount<0||!['DEBIT','CREDIT'].includes(side))throw Error('Line '+(i+1)+': enter Ledger Date, amount and Debit/Credit.');return{ledger_date:val('.ledate'),particular:window.MMALedger575?.code(val('.lepart'),side)||requireLedgerParticular573(val('.lepart')),particular_name:window.MMALedger575?.label(val('.lepart'))||val('.lepart'),voucher_type:val('.levoucher'),voucher_no:val('.levno'),entry_type:side,amount}});
 for(let i=0;i<lines.length;i++){
  const row=rows[i],line=lines[i];let id=row.dataset.v280SavedId||(i===0?editId:'');
  const ref=row.dataset.ref579||(i===0&&editId?(base||ledgerRef()):lines.length===1&&base?base:ledgerRef());row.dataset.ref579=ref;
  const header={...shared,ref_no:ref,ledger_date:line.ledger_date,debit_amount:line.entry_type==='DEBIT'?line.amount:0,credit_amount:line.entry_type==='CREDIT'?line.amount:0};
  const result=id?await sb.from('ledger_entries').update(header).eq('id',id).select().single():await sb.from('ledger_entries').insert(header).select().single();
  if(result.error)throw Error('Line '+(i+1)+' header: '+result.error.message+'. Retry will resume saved lines.');
  id=result.data.id;row.dataset.v280SavedId=id;
  const childId=row.dataset.v280LineId,detail={...line,ledger_entry_id:id};
  const child=childId?await sb.from('ledger_entry_lines').update(detail).eq('id',childId).select('id').single():await sb.from('ledger_entry_lines').insert(detail).select('id').single();
  if(child.error)throw Error('Line '+(i+1)+' header saved; details failed: '+child.error.message+'. Retry will resume saved lines.');
  row.dataset.v280LineId=child.data.id;MMAForm578.remember('ledger',result.data);
 }
 const retained=new Set(rows.map(row=>row.dataset.v280LineId)),removed=JSON.parse(form.dataset.ledgerLines579||'[]').filter(id=>!retained.has(id));
 if(removed.length){const r=await sb.from('ledger_entry_lines').delete().eq('ledger_entry_id',editId).in('id',removed);if(r.error)throw Error('Saved lines; removed-line cleanup failed: '+r.error.message+'. Retry to complete.');}
 form.dataset.ledgerLines579=JSON.stringify([...retained]);MMAForm578.done('ledger');ledgerListPage=0;document.getElementById('ledgerSearch').value='';const range=fyRange();document.getElementById('ledgerFrom').value=range.from;document.getElementById('ledgerTo').value=range.to;renderLedgerEntries();
}
