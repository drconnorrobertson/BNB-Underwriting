// Same-origin AirROI proxy. Configure AIRROI_API_KEY in Vercel, never in source.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.AIRROI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AirROI is not configured' });

  const path = req.query?.path;
  if (typeof path !== 'string' || path.length > 2048) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  let url;
  try {
    url = new URL(path, 'https://api.airroi.com');
  } catch {
    return res.status(400).json({ error: 'Invalid path' });
  }
  if (url.origin !== 'https://api.airroi.com' || url.pathname !== '/calculator/estimate') {
    return res.status(400).json({ error: 'Unsupported AirROI endpoint' });
  }

  for (const [name, value] of Object.entries(req.query || {})) {
    if (name !== 'path' && typeof value === 'string') url.searchParams.append(name, value);
  }

  try {
    const upstream = await fetch(url, { headers: { 'X-API-KEY': apiKey } });
    const body = await upstream.text();
    res.setHeader('Content-Type', (upstream.headers.get('content-type') || '').includes('application/json')
      ? 'application/json' : 'text/plain; charset=utf-8');
    return res.status(upstream.status).send(body);
  } catch {
    return res.status(502).json({ error: 'AirROI request failed' });
  }
}
