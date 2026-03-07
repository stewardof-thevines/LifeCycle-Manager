/**
 * /api/airtable.js — Airtable reverse proxy for Lifecycle Manager
 *
 * Vercel serverless function. Holds AIRTABLE_API_KEY as an env var so
 * it is never exposed in client-side HTML.
 *
 * Set this in Vercel project settings → Environment Variables:
 *   AIRTABLE_API_KEY = patXXXXXXXXXXXXXX...
 *
 * GET  /api/airtable?baseId=...&tableId=...&fields=[...]&sort=[...]&maxRecords=...
 *   → proxies to Airtable List Records
 *
 * POST /api/airtable  { baseId, tableId, fields: { fieldId: value, ... } }
 *   → proxies to Airtable Create Record
 *
 * PATCH /api/airtable { baseId, tableId, recordId, fields: { ... } }
 *   → proxies to Airtable Update Record
 */

// ── Clerk JWT verification ───────────────────────────────────────────────
async function verifyClerkToken(req) {
  const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
  if (!CLERK_SECRET_KEY) return { error: 'CLERK_SECRET_KEY not set' };

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return { error: 'No token provided' };

  try {
    // Verify the session token with Clerk's API
    const r = await fetch('https://api.clerk.com/v1/sessions/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `token=${encodeURIComponent(token)}`,
    });
    if (!r.ok) return { error: 'Invalid session' };
    return { ok: true };
  } catch(e) {
    return { error: 'Auth check failed' };
  }
}

export default async function handler(req, res) {
  // ── CORS — locked to your Vercel domain ─────────────────────────────────
  const origin = req.headers.origin || '';
  const allowed = process.env.ALLOWED_ORIGIN || 'https://life-cycle-manager.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Auth check ───────────────────────────────────────────────────────────
// Auth disabled — re-enable when custom domain + Clerk production keys are ready
// const auth = await verifyClerkToken(req);
// if (auth.error) {
//   return res.status(401).json({ error: 'Unauthorized', detail: auth.error });
// }

  const API_KEY = process.env.AIRTABLE_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'AIRTABLE_API_KEY env var not set' });
  }

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };

  // ── GET — list records ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { baseId, tableId, fields, sort, maxRecords, filterByFormula, offset } = req.query;
    if (!baseId || !tableId) {
      return res.status(400).json({ error: 'baseId and tableId are required' });
    }

    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);

    // fields[]=fldXXX&fields[]=fldYYY
    if (fields) {
      try {
        JSON.parse(fields).forEach(f => url.searchParams.append('fields[]', f));
      } catch { url.searchParams.set('fields', fields); }
    }

    // sort[0][field]=fldXXX&sort[0][direction]=desc
    if (sort) {
      try {
        JSON.parse(sort).forEach((s, i) => {
          url.searchParams.set(`sort[${i}][field]`, s.field || s.fieldId);
          url.searchParams.set(`sort[${i}][direction]`, s.direction || 'asc');
        });
      } catch {}
    }

    if (maxRecords)        url.searchParams.set('maxRecords', maxRecords);
    if (filterByFormula)   url.searchParams.set('filterByFormula', filterByFormula);
    if (offset)            url.searchParams.set('offset', offset);

    // Return field IDs instead of names so client code uses stable IDs
    url.searchParams.set('returnFieldsByFieldId', 'true');

    try {
      const airtableRes = await fetch(url.toString(), { headers });
      const data = await airtableRes.json();
      if (!airtableRes.ok) return res.status(airtableRes.status).json(data);
      return res.status(200).json(data);
    } catch (e) {
      return res.status(502).json({ error: 'Airtable fetch failed', detail: e.message });
    }
  }

  // ── POST — create record ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { baseId, tableId, fields } = req.body || {};
    if (!baseId || !tableId || !fields) {
      return res.status(400).json({ error: 'baseId, tableId, and fields are required' });
    }

    // Strip undefined values
    const cleanFields = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined && v !== null)
    );

    try {
      const airtableRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tableId}`,
        { method: 'POST', headers, body: JSON.stringify({ fields: cleanFields }) }
      );
      const data = await airtableRes.json();
      if (!airtableRes.ok) return res.status(airtableRes.status).json(data);
      return res.status(200).json(data);
    } catch (e) {
      return res.status(502).json({ error: 'Airtable create failed', detail: e.message });
    }
  }

  // ── PATCH — update record ────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { baseId, tableId, recordId, fields } = req.body || {};
    if (!baseId || !tableId || !recordId || !fields) {
      return res.status(400).json({ error: 'baseId, tableId, recordId, and fields are required' });
    }

    const cleanFields = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined && v !== null)
    );

    try {
      const airtableRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`,
        { method: 'PATCH', headers, body: JSON.stringify({ fields: cleanFields }) }
      );
      const data = await airtableRes.json();
      if (!airtableRes.ok) return res.status(airtableRes.status).json(data);
      return res.status(200).json(data);
    } catch (e) {
      return res.status(502).json({ error: 'Airtable update failed', detail: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
