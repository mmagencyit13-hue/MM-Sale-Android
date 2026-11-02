export const CHANNEL = 'mma_messages_tasks_v608';
export function messageFor(job, now = Date.now()) {
  const ttl = Math.max(0, Math.min(86400, Math.floor((Date.parse(job.expires_at) - now) / 1000)));
  if (!ttl) return null;
  const data = Object.fromEntries(Object.entries(job.data || {}).map(([k,v]) => [k,String(v)]));
  data.event_id = 'mma613-' + job.id;
  data.expires_at = String(Date.parse(job.expires_at));
  const test = data.type === 'test';
  return { message: { token: job.token, data,
    notification: { title: test ? 'MM Agency · Firebase Test' : 'MM Agency',
      body: test ? 'Server se Firebase notification pahunch gayi.' : 'New message or scheduled update. Login to view details.' },
    android: { priority: 'HIGH', ttl: ttl + 's', notification: {
      channel_id: CHANNEL, icon: 'ic_stat_mma', sound: 'default', tag: data.event_id,
      visibility: 'PRIVATE', notification_priority: 'PRIORITY_HIGH'
    } }
  } };
}
export function firebaseFailure(status, body) {
  const codes = (body?.error?.details || []).map(d => d.errorCode);
  // INVALID_ARGUMENT alone must not disable a valid token: payload mistakes can cause it.
  return { dead: codes.includes('UNREGISTERED'), reason: codes.includes('UNREGISTERED') ? 'UNREGISTERED' : 'FCM_HTTP_' + status };
}
export function credentials(raw) {
  const c = JSON.parse(raw || '{}');
  if (c.project_id !== 'mm-agency-74c0c' || !String(c.client_email).endsWith('.iam.gserviceaccount.com') ||
      !String(c.private_key).includes('BEGIN PRIVATE KEY')) throw Error('Firebase service account configuration invalid');
  return c;
}
