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

export {messageFor,firebaseFailure};
