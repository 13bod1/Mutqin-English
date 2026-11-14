import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const port = Number(Deno.env.get('PORT')) || 8000;

// Every media request is bound to a verified auth token and the current server session.
// No browser-side signing secret and no public Storage URL is returned to the caller.
// Requires private Storage bucket + configured playback_assets rows. NOT licensed DRM.
Deno.serve({ port }, async (request: Request) => {
  const headers = { 'Cache-Control': 'private, no-store', 'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
  const json = (status: number, message: string) => Response.json({ error: message }, { status, headers });
  try {
    if (request.method !== 'POST') return json(405, 'POST required');
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !service) return json(503, 'Protected media service is not configured');
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json(401, 'Authentication required');
    const actor = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const verified = await actor.auth.getUser(authorization.slice(7));
    if (verified.error || !verified.data.user) return json(401, 'Invalid session');
    let body: Record<string, unknown>;
    try {
      body = await request.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, 'Invalid JSON');
    } catch {
      return json(400, 'Invalid JSON');
    }
    const { lectureId, deviceId, sessionToken } = body;
    if (typeof lectureId !== 'string' || typeof deviceId !== 'string' || typeof sessionToken !== 'string'
        || !/^[0-9a-f-]{36}$/i.test(lectureId) || !/^[0-9a-f]{64}$/.test(sessionToken)) return json(400, 'Invalid media request');
    const checked = await actor.rpc('authorize_playback_asset', { p_lecture_id: lectureId, p_device_id: deviceId, p_session_token: sessionToken });
    if (checked.error || !checked.data) return json(403, 'Media access denied or viewing session replaced');
    const bucket = checked.data.bucket, path = checked.data.objectPath;
    if (typeof bucket !== 'string' || typeof path !== 'string' || !bucket || !path || path.includes('..')) return json(503, 'Protected asset mapping invalid');
    const storage = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const signed = await storage.storage.from(bucket).createSignedUrl(path, 30);
    if (signed.error || !signed.data.signedUrl) return json(503, 'Protected asset is unavailable');
    // Storage host is anchored to the configured Supabase project; never fetch arbitrary body URLs.
    let target: URL;
    try {
      target = new URL(signed.data.signedUrl);
      if (target.origin !== new URL(url).origin) return json(503, 'Unexpected storage host');
    } catch {
      return json(503, 'Unexpected storage host');
    }
    const range = request.headers.get('Range');
    if (range && !/^bytes=\d*-\d*$/.test(range)) return json(416, 'Invalid range');
    let media: Response;
    try { media = await fetch(target, { headers: range ? { Range: range } : {}, signal: AbortSignal.timeout(20000), redirect: 'error' }); }
    catch { return json(503, 'Media fetch failed'); }
    if (![200, 206].includes(media.status)) { await media.body?.cancel(); return json(502, 'Media storage request failed'); }
    const resultHeaders = new Headers(headers);
    for (const name of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
      const value = media.headers.get(name); if (value) resultHeaders.set(name, value);
    }
    resultHeaders.set('Content-Disposition', 'inline');
    return new Response(media.body, { status: media.status, headers: resultHeaders });
  } catch (_err) {
    return json(500, 'Internal media service error');
  }
});
