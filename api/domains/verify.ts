import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customHostnameId } = req.body;

  if (!customHostnameId) {
    return res.status(400).json({ error: 'Missing customHostnameId' });
  }

  try {
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${customHostnameId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const cfData = await cfResponse.json();

    if (!cfData.success) {
      console.error('[domains/verify] Cloudflare error:', cfData.errors);
      return res.status(502).json({ error: 'Failed to check domain status' });
    }

    const result = cfData.result;
    const sslStatus = result.ssl?.status || 'unknown';
    const hostnameStatus = result.status;

    const verified = hostnameStatus === 'active' && sslStatus === 'active';

    console.log(`[domains/verify] ${result.hostname}: hostname=${hostnameStatus}, ssl=${sslStatus}, verified=${verified}`);

    return res.status(200).json({
      verified,
      hostname_status: hostnameStatus,
      ssl_status: sslStatus,
      errors: result.verification_errors || [],
    });
  } catch (error: any) {
    console.error('[domains/verify] Error:', error);
    return res.status(500).json({ error: error.message || 'Verification check failed' });
  }
}
