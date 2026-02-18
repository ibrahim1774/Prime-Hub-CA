import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subdomain, custom_domain } = req.body || {};

  if (!subdomain && !custom_domain) {
    return res.status(400).json({ error: 'Provide subdomain or custom_domain' });
  }

  const PURGE_SECRET = process.env.PURGE_SECRET;
  if (!PURGE_SECRET) {
    return res.status(500).json({ error: 'PURGE_SECRET not configured' });
  }

  try {
    const response = await fetch('https://ablarme.com/api/purge-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Purge-Secret': PURGE_SECRET,
      },
      body: JSON.stringify({ subdomain, custom_domain }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[purge-cache] Error:', error);
    return res.status(500).json({ error: error.message || 'Cache purge failed' });
  }
}
