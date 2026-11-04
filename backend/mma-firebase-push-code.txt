// Main-account migration: supports existing test tokens and new MM Sale tokens.
// Deploy as mma-firebase-push; verify_jwt=false. Every operation verifies its own credential.
const CHANNEL = 'mma_messages_tasks_v608';
function messageFor(job, now = Date.now()) {
  const ttl = Math.max(0, Math.min(86400, Math.floor((Date.parse(job.expires_at) - now) / 1000)));
  if (!ttl) return null;
  const data = Object.fromEntries(Object.entries(job.data || {}).map(([k,v]) => [k,String(v)]));
  data.event_id = 'mma613-' + job.id;
  data.expires_at = String(Date.parse(job.expires_at));
  const test = data.type === 'test';
  const buddy = data.type === 'buddy';
  return { message: { token: job.token, data,
    notification: { title: buddy ? 'MM Buddy' : test ? 'MM Agency · Firebase Test' : 'MM Agency',
      body: buddy ? (data.report_type === 'orders' ? 'Kal ke order form ki report taiyar hai. MM Buddy kholein.' : 'Aaj ki client dating / visits ki report taiyar hai. MM Buddy kholein.') : test ? 'Server se Firebase notification pahunch gayi.' : 'New message or scheduled update. Login to view details.' },
    android: { priority: 'HIGH', ttl: ttl + 's', notification: {
      channel_id: CHANNEL, icon: 'ic_stat_mma', sound: 'default', tag: data.event_id,
      visibility: 'PRIVATE', notification_priority: 'PRIORITY_HIGH'
    } }
  } };
}
function firebaseFailure(status, body) {
  const codes = (body?.error?.details || []).map(d => d.errorCode);
  // INVALID_ARGUMENT alone must not disable a valid token: payload mistakes can cause it.
  return { dead: codes.includes('UNREGISTERED'), reason: codes.includes('UNREGISTERED') ? 'UNREGISTERED' : 'FCM_HTTP_' + status };
}
function credentials(raw, project) {
  const c = JSON.parse(raw || '{}');
  if (c.project_id !== project || !String(c.client_email).endsWith('.iam.gserviceaccount.com') ||
      !String(c.private_key).includes('BEGIN PRIVATE KEY')) throw Error('Firebase service account configuration invalid');
  return c;
}

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,apikey,x-erp-session,x-mma-worker', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };
const url = Deno.env.get('SUPABASE_URL');
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const tokenCache = {};
const PROJECTS = { legacy: {id:'mm-agency-74c0c', secret:'FCM_SERVICE_ACCOUNT_JSON'}, main: {id:'mm-agency-7ca84', secret:'FCM_SERVICE_ACCOUNT_JSON_MAIN'} };
function json(body, status=200) { return new Response(JSON.stringify(body), {status,headers:{...cors,'Content-Type':'application/json'}}); }
async function rpc(name, args={}) {
  const r = await fetch(url + '/rest/v1/rpc/' + name, {method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
  const b = await r.json();
  if (!r.ok) throw Error('Database operation failed: '+name);
  return b;
}
const base64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const enc = value => base64(new TextEncoder().encode(JSON.stringify(value)));
async function accessToken(which = 'legacy') {
  const project = PROJECTS[which];
  const cached = tokenCache[which] || {token:'',until:0};
  if (cached.until > Date.now()) return cached.token;
  const c = credentials(Deno.env.get(project.secret), project.id);
  const now = Math.floor(Date.now()/1000);
  const body = enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:c.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
  const pem = c.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
  const der = Uint8Array.from(atob(pem),x=>x.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(body)));
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:body+'.'+base64(signature)}),signal:AbortSignal.timeout(15000)});
  const result = await r.json();
  if (!r.ok || !result.access_token) throw Error('Firebase server authorization failed');
  tokenCache[which]={token:result.access_token,until:Date.now()+Math.max(0,(Number(result.expires_in||3600)-120))*1000};
  return tokenCache[which].token;
}
async function sendFirebase(which, bearer, payload) {
  return fetch('https://fcm.googleapis.com/v1/projects/' + PROJECTS[which].id + '/messages:send', {
    method:'POST', headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},
    body:JSON.stringify(payload), signal:AbortSignal.timeout(10000)
  });
}
async function work() {
  // Verify credentials before leasing jobs so a missing secret does not consume retries.
  const bearer = await accessToken();
  await rpc('mma629_buddy_sync');
  const jobs = await rpc('mma613_claim');
  let accepted=0,failed=0;
  // Bounded concurrency keeps the lease valid and avoids unbounded external requests.
  for (let i=0;i<jobs.length;i+=5) await Promise.all(jobs.slice(i,i+5).map(async job=>{
    let ok=false,dead=false,reason='';
    try {
      if (!await rpc('mma613_job_valid',{p_id:job.id,p_lease:job.lease,p_token:job.token})) {
        ok=true;reason='Registration or event changed';
      } else {
        const payload=messageFor(job);
        if (!payload) {ok=true;reason='Expired';}
        else {
          let which = 'legacy';
          let r = await sendFirebase(which, bearer, payload);
          let result = await r.json();
          // A rejected sender means this token belongs to the other configured project.
          // Never retry accepted sends or ambiguous transport failures (duplicate risk).
          if ((result?.error?.details || []).some(d => d.errorCode === 'SENDER_ID_MISMATCH')) {
            which = 'main';
            r = await sendFirebase(which, await accessToken(which), payload);
            result = await r.json();
          }
          ok = r.ok;
          if (!ok) {
            const failure = firebaseFailure(r.status, result);
            dead = failure.dead; reason = failure.reason;
            if (r.status === 401 && tokenCache[which]) tokenCache[which].until = 0;
          }
        }
      }
    } catch { reason='Push transport failed'; }
    await rpc('mma613_finish',{p_id:job.id,p_lease:job.lease,p_ok:ok,p_dead:dead,p_error:reason,p_token:job.token});
    if(ok) accepted++;else failed++;
  }));
  return {accepted,failed};
}
// Immediate test dispatch uses the same leased queue and completion checks as the worker.
async function immediateTest648(session,device,jobId){
 const job=await rpc('mma648_claim_test',{p_session:session,p_device:device,p_job:jobId});
 if(!job)return false; // Existing worker won the lease; never send the same job twice.
 let ok=false,dead=false,reason='';
 try{
  if(!await rpc('mma613_job_valid',{p_id:job.id,p_lease:job.lease,p_token:job.token})){reason='Registration or event changed';}
  else{
   const payload=messageFor(job);
   if(!payload){reason='Expired';}
   else{
    let which='main',bearer;
    try{bearer=await accessToken('main');}catch{which='legacy';bearer=await accessToken('legacy');}
    let r=await sendFirebase(which,bearer,payload),body=await r.json();
    if((body?.error?.details||[]).some(d=>d.errorCode==='SENDER_ID_MISMATCH')){
     which=which==='main'?'legacy':'main';r=await sendFirebase(which,await accessToken(which),payload);body=await r.json();
    }
    ok=r.ok;
    if(!ok){const failure=firebaseFailure(r.status,body);dead=failure.dead;reason=failure.reason;if(r.status===401&&tokenCache[which])tokenCache[which].until=0;}
   }
  }
 }catch{reason='Push transport failed';}
 await rpc('mma613_finish',{p_id:job.id,p_lease:job.lease,p_ok:ok,p_dead:dead,p_error:reason,p_token:job.token});
 return ok;
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response(null,{headers:cors});
  if(req.method!=='POST') return json({error:'POST required'},405);
  try {
    if(Number(req.headers.get('content-length')||0)>12000) return json({error:'Request too large'},413);
    const raw=await req.text();if(raw.length>12000) return json({error:'Request too large'},413);
    const b=JSON.parse(raw||'{}');
    if(b.op==='work') {
      const key=req.headers.get('x-mma-worker')||'';
      if(!/^[a-f0-9]{64}$/.test(key)||!await rpc('mma613_worker_authorize',{p_key:key})) return json({error:'Unauthorized'},401);
      return json(await work());
    }
    if(!['register','test','status'].includes(b.op)) return json({error:'Unknown operation'},400);
    const session=req.headers.get('x-erp-session')||'';
    if(!/^[a-f0-9]{64}$/i.test(session)) return json({error:'Login required'},401);
    if(!/^[a-f0-9-]{36}$/i.test(String(b.device_id||''))) return json({error:'Invalid device'},400);
    // All public operations authenticate the custom employee session inside the RPC.
    if(b.op==='register') {
      if(typeof b.token!=='string'||b.token.length<30||b.token.length>4096) return json({error:'Invalid token'},400);
      return json(await rpc('mma613_register',{p_session:session,p_device:b.device_id,p_fcm:b.token}));
    }
    if(b.op==='status') return json(await rpc('mma613_status',{p_session:session,p_device:b.device_id,p_job:b.job_id}));
    const result=await rpc('mma613_test',{p_session:session,p_device:b.device_id});
    if(result?.ok&&result.job_id){
      try{result.firebase_accepted=await immediateTest648(session,b.device_id,result.job_id);}catch{result.firebase_accepted=false;}
    }
    return json(result);
  } catch(e) {
    // No session tokens, Firebase credentials or upstream response bodies in logs/responses.
    console.error('V613 request failed',String(e.message).startsWith('Database')?'database':'configuration/transport');
    return json({error:'Notification server request failed. Check deployment, login and server configuration.'},400);
  }
});
