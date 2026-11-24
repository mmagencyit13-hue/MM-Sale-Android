(() => {
  'use strict';
  const labels = {company_name:'Name', item_required:'Item', credit_limit:'Credit Limit', reference_company:'Reference'};
  const q = id => document.getElementById(id);
  const business = () => window.MMA548?.segment || 'readymade';
  let inbox = null, polling = false, sessionKey = '';
  let panel;

  async function request(action, args={}) {
    const auth = window.ERPEmployeeAuth;
    const context = business();
    if (auth?.buyerApproval689) return auth.buyerApproval689(action,{...args,business:context});
    const employee = auth?.employee;
    const token = localStorage.getItem('mma_sales_employee_session_v1');
    if (!employee || !token || !window.MMA_CONFIG) throw Error('Please sign in.');
    const endpoint = MMA_CONFIG.employeeGateway.replace('/functions/v1/employee-gateway','/rest/v1/rpc/mma689_buyer_approval');
    const response = await fetch(endpoint,{
      method:'POST',headers:{'Content-Type':'application/json',apikey:MMA_CONFIG.publicKey},
      body:JSON.stringify({p_token:token,p_action:action,p_args:{...args,business:context}}),
      signal:AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.message || 'Buyer approval is unavailable.');
    if (auth.employee?.id!==employee.id || localStorage.getItem('mma_sales_employee_session_v1')!==token || business()!==context) {
      throw Error('Login or business changed. Reopen Buyer Approval.');
    }
    return data;
  }

  function dialog(title) {
    const box = document.createElement('dialog');
    box.style.cssText = 'width:min(92vw,510px);max-height:90vh;overflow:auto;padding:18px;border:1px solid #b5c1ca;border-radius:12px';
    const heading = document.createElement('h3');
    heading.textContent = title;
    box.append(heading);
    document.body.append(box);
    box.addEventListener('close',() => box.remove(),{once:true});
    return box;
  }
  function button(label, onClick) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.addEventListener('click',onClick);
    return element;
  }

  function review(buyer,decision) {
    return new Promise(resolve => {
      const box = dialog(decision==='Approved' ? 'Approve buyer' : 'Reject buyer');
      const form = document.createElement('form');
      const inputs = new Map();
      function add(key,label,control,value) {
        const holder = document.createElement('label');
        holder.style.cssText='display:block;margin:10px 0';
        control.style.cssText='display:block;width:100%;box-sizing:border-box;padding:8px';
        control.value = value ?? '';
        holder.append(label,control);
        form.append(holder);
        inputs.set(key,control);
      }
      if (decision==='Approved') {
        for (const [key,label] of Object.entries(labels)) {
          const input = document.createElement('input');
          input.type = key==='credit_limit'?'number':'text';
          if (key==='credit_limit') { input.min='0'; input.step='any'; }
          else input.maxLength=300;
          input.required = key==='company_name';
          const value = buyer[key];
          add(key,label,input,Array.isArray(value)?value.join(', '):value);
        }
      } else {
        const remark=document.createElement('textarea');
        remark.required=true;
        remark.maxLength=1000;
        add('remark','Reason for rejection',remark,'');
      }
      const submit=document.createElement('button');
      submit.type='submit';
      submit.textContent=decision==='Approved'?'Approve':'Not Approved';
      form.append(submit,button('Cancel',()=>box.close()));
      let result=null;
      form.addEventListener('submit',event => {
        event.preventDefault();
        const edits={};
        let remark='';
        for (const [key,input] of inputs) {
          const typed=input.value.trim();
          if (key==='remark') { if (!typed) { input.focus();return; } remark=typed;continue; }
          const original=Array.isArray(buyer[key])?buyer[key].join(', '):String(buyer[key]??'');
          if (typed!==original.trim()) edits[key]=key==='credit_limit'?(typed===''?null:Number(typed)):typed;
        }
        result={id:buyer.id,revision:String(buyer.approval_revision),decision,edits,remark};
        box.close();
      });
      box.append(form);
      box.addEventListener('close',()=>resolve(result),{once:true});
      box.showModal();
    });
  }

  function publish(data) {
    inbox=data;
    paint();
    window.dispatchEvent(new Event('mma689:inbox'));
  }
  async function refresh() {
    if (polling || document.hidden || q('app')?.classList.contains('hide') || window.MMA548?.ready===false) return;
    const auth = window.ERPEmployeeAuth;
    const session = auth?.employee?.id || (auth?.buyerApproval689?'desktop':'');
    const key = session+'|'+business();
    if (key!==sessionKey) {sessionKey=key;publish(null);}
    if (!session) return;
    polling=true;
    try { const data=await request('inbox'); if (sessionKey===key) publish(data); }
    catch (error) { const status=q('buyerInboxStatus689');
      if(status)status.textContent=error.message; }
    finally { polling=false; }
  }
  async function markReview(rows) {
    const seen=rows.filter(x=>x.buyer?.approval_status==='Pending'&&x.buyer.approval_revision!=null)
      .map(x=>({id:x.buyer.id,revision:String(x.buyer.approval_revision)}));
    if (seen.length) publish(await request('mark-review-read',{seen}));
  }
  function openDecision(row) {
    const box=dialog(row.buyer_name+' · '+row.decision);
    const details=document.createElement('div');
    if (row.remark) {
      const p=document.createElement('p'); p.textContent='Rejection remark: '+row.remark;details.append(p);
    }
    for (const [key,change] of Object.entries(row.changes||{})) {
      const p=document.createElement('p');
      p.textContent=(labels[key]||key)+': '+(change.old??'—')+' → '+(change.new??'—');
      details.append(p);
    }
    box.append(details,button('Close',()=>box.close()));
    if (row.decision==='Not Approved' && typeof window.editB==='function') {
      box.append(button('Edit buyer and resend',async()=>{
        box.close();
        if (panel?.open) panel.close();
        try { await window.editB(row.buyer_id); }
        catch(error){alert(error.message);}
      }));
    }
    box.showModal();
    void request('mark-decision-read',{notice:row.id}).then(publish).catch(()=>{});
  }
  function paint() {
    const list=q('buyerInbox689');
    if (!list) return;
    const reviewRows=inbox?.review||[], decisions=inbox?.decisions||[];
    list.replaceChildren();
    const heading=document.createElement('h3');
    heading.textContent='Buyer Approval'+(inbox?.unread?' ('+inbox.unread+')':'');
    list.append(heading);
    const status=document.createElement('p');
    status.id='buyerInboxStatus689';
    status.setAttribute('role','status');
    list.append(status);
    const recipient=inbox?.actor;
    for (const row of reviewRows) {
      list.append(button('Review · '+row.company_name,async()=>{
        const existing=q('notificationDialog');
        if(existing?.open) existing.close();
        if(panel?.open) panel.close();
        try {
          if(window.MMAAppTab410) await window.MMAAppTab410('chat');
          await window.erp377ChatBridge.openApproval528({buyer_id:row.id,revision:row.revision,recipient_id:recipient});
        } catch(error){alert(error.message);}
      }));
    }
    for (const row of decisions) list.append(button((row.read_at?'':'● ')+row.buyer_name+' · '+row.decision,()=>openDecision(row)));
    if (!reviewRows.length&&!decisions.length) {
      const empty=document.createElement('p');empty.textContent='No buyer approval notifications.';list.append(empty);
    }
    const bell=q('buyerBell689');
    if (bell) bell.textContent='Buyer approvals'+(inbox?.unread?' ('+inbox.unread+')':'');
  }
  function mount() {
    const section=document.createElement('section');
    section.id='buyerInbox689';
    section.style.cssText='display:grid;gap:6px;margin:12px 0';
    if (q('notificationSummary')) {
      q('notificationSummary').after(section);
      q('notificationBell')?.addEventListener('click',()=>void refresh());
    } else {
      const bell=button('Buyer approvals',()=>{
        if(!panel.open)panel.showModal();
        void refresh();
      });
      bell.id='buyerBell689';
      bell.style.cssText='position:fixed;bottom:126px;right:14px;z-index:9000';
      document.body.append(bell);
      panel=dialog('Buyer approval notifications');
      // The desktop inbox is reused on each opening.
      const replacement=panel.cloneNode(true);
      panel.remove();
      panel=replacement;
      const status=document.createElement('p');status.setAttribute('role','status');
      panel.append(status,section,button('Close',()=>panel.close()));
      document.body.append(panel);
    }
    paint();
    void refresh();
    setInterval(()=>void refresh(),15000);
    document.addEventListener('visibilitychange',()=>void refresh());
  }
  window.MMABuyerWorkflow689={request,refresh,markReview,review,get count(){return inbox?.unread||0},get reviewUnread(){return inbox?.reviewUnread||0}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
