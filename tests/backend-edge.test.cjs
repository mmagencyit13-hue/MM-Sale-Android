const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
(async()=>{
 const pair=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const der=await webcrypto.subtle.exportKey('pkcs8',pair.privateKey);
 const creds={project_id:'mm-agency-74c0c',client_email:'test@mm-agency-74c0c.iam.gserviceaccount.com',private_key:'-----BEGIN PRIVATE KEY-----\n'+Buffer.from(der).toString('base64')+'\n-----END PRIVATE KEY-----'};
 let handler,sends=0,finished=[],jwtVerified=false,directClaim=true;
 const job={id:1,lease:'lease',device_id:'d',recipient_id:'alice',token:'device-token',data:{type:'chat',recipient_id:'alice'},expires_at:new Date(Date.now()+60000).toISOString()};
 const c={console:{error(){}},Request,Response,TextEncoder,Uint8Array,URLSearchParams,AbortSignal,atob,btoa,crypto:webcrypto,Deno:{env:{get:k=>({SUPABASE_URL:'https://db.test',SUPABASE_SERVICE_ROLE_KEY:'service',FCM_SERVICE_ACCOUNT_JSON:JSON.stringify(creds)})[k]},serve:f=>handler=f},fetch:async(url,opts)=>{
  if(url==='https://oauth2.googleapis.com/token'){
   const jwt=opts.body.get('assertion').split('.');const payload=JSON.parse(Buffer.from(jwt[1],'base64url'));
   assert.equal(payload.scope,'https://www.googleapis.com/auth/firebase.messaging');
   jwtVerified=await webcrypto.subtle.verify('RSASSA-PKCS1-v1_5',pair.publicKey,Buffer.from(jwt[2],'base64url'),new TextEncoder().encode(jwt[0]+'.'+jwt[1]));
   return Response.json({access_token:'oauth-token',expires_in:3600});
  }
  if(url.startsWith('https://fcm.googleapis.com/')){sends++;assert.equal(opts.headers.Authorization,'Bearer oauth-token');assert(JSON.parse(opts.body).message.notification);return Response.json({name:'accepted'});}
  const fn=url.split('/').at(-1),args=JSON.parse(opts.body);
  const data={mma648_claim_test:directClaim?{...job,data:{type:"test",recipient_id:"alice"}}:null,mma629_buddy_sync:0,mma613_worker_authorize:args.p_key==='a'.repeat(64),mma613_claim:[job],mma613_job_valid:true,mma613_register:{ok:true},mma613_test:{ok:true,job_id:1},mma613_status:{accepted:true}};
  if(fn==='mma613_finish'){finished.push(args);return Response.json(null);}
  assert(fn in data);return Response.json(data[fn]);
 }};
 vm.createContext(c);vm.runInContext(fs.readFileSync('backend/index.ts','utf8'),c);
 const req=(b,h={})=>handler(new Request('https://edge.test',{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify(b)}));
 let n=0;const pass=s=>console.log('PASS Edge '+(++n)+' '+s);
 assert.equal((await req({op:'work'})).status,401);assert.equal(sends,0);pass('unauthenticated worker rejected before send');
 assert.equal((await req({op:'register',device_id:'d',token:'x'})).status,401);pass('missing session rejected');
 assert.equal((await req({op:'work'},{'x-mma-worker':'b'.repeat(64)})).status,401);pass('wrong worker credential rejected');
 const r=await req({op:'work'},{'x-mma-worker':'a'.repeat(64)});assert.equal(r.status,200);assert.equal(sends,1);assert(jwtVerified);pass('real RS256 JWT signature verified with service-account public key');
 assert.equal(finished[0].p_ok,true);assert.equal(finished[0].p_token,'device-token');pass('Firebase acceptance acknowledged with lease and token');
 assert.equal((await req({op:'unknown'})).status,400);pass('unknown operation rejected');
 const headers={'x-erp-session':'a'.repeat(64)};
 const testBody={op:'test',device_id:'11111111-1111-4111-8111-111111111111'};
 let before=sends;let test=await req(testBody,headers);assert.equal(test.status,200);assert.equal((await test.json()).firebase_accepted,true);assert.equal(sends,before+1);pass('authenticated test can dispatch immediately through its targeted queue lease');
 directClaim=false;before=sends;test=await req(testBody,headers);assert.equal((await test.json()).firebase_accepted,false);assert.equal(sends,before);pass('worker-owned test lease is never sent a second time');
 before=sends;assert.equal((await req(testBody)).status,401);assert.equal(sends,before);pass('immediate test still rejects missing session before any send');

 console.log(n+' Edge handler scenarios passed with mocked network and real cryptography.');
})().catch(e=>{console.error(e);process.exitCode=1});
