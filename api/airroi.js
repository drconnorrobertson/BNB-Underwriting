// api/airroi.js - Vercel serverless proxy for AirROI API
// Routes all AirROI calls through the server to bypass browser CORS restrictions

export default async function handler(req, res) {
  // CORS headers for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const AIRROI_KEY = 'PVvRRJBXeB18yr8BQHY0V8iQbYzo7S965h4D6jYc';
  const AIRROI_BASE = 'https://api.airroi.com';

  // path comes as query param: ?path=/calculator/estimate&lat=...&bedrooms=...
  const { path, ...params } = req.query;

  if (!path) {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  try {
    let url;
    let options = {
      headers: {
        'X-API-KEY': AIRROI_KEY,
        'Content-Type': 'application/json',
      },
    };

    if (req.method === 'POST') {
      url = `${AIRROI_BASE}${path}`;
      options.method = 'POST';
      options.body = JSON.stringify(req.body);
    } else {
      // Build query string from remaining params
      const qs = new URLSearchParams(params).toString();
      url = `${AIRROI_BASE}${path}${qs ? '?' + qs : ''}`;
      options.method = 'GET';
    }

    const response = await fetch(url, options);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
