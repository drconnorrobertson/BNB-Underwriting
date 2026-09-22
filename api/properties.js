// Same-origin RapidAPI proxy. Configure RAPIDAPI_KEY in Vercel, never in source.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Property data is not configured' });

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 10000) {
    return res.status(400).json({ error: 'Invalid search request' });
  }

  try {
    const upstream = await fetch('https://realty-in-us.p.rapidapi.com/properties/v3/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'realty-in-us.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
      body: JSON.stringify(body),
    });
    const responseBody = await upstream.text();
    res.setHeader('Content-Type', (upstream.headers.get('content-type') || '').includes('application/json')
      ? 'application/json' : 'text/plain; charset=utf-8');
    return res.status(upstream.status).send(responseBody);
  } catch {
    return res.status(502).json({ error: 'Property search failed' });
  }
}
