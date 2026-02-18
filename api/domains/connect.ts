import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain, siteId } = req.body;

  if (!domain || !siteId) {
    return res.status(400).json({ error: 'Missing domain or siteId' });
  }

  // Validate domain format (supports multi-part TLDs like .co.uk)
  const domainRegex = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z]{2,})+$/;
  if (!domainRegex.test(domain.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid domain format' });
  }

  // Block ablarme.com subdomains
  if (domain.toLowerCase().endsWith('.ablarme.com') || domain.toLowerCase() === 'ablarme.com') {
    return res.status(400).json({ error: 'Cannot use an ablarme.com subdomain' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, serviceRoleKey);

  try {
    // 1. Check no other site uses this domain
    const { data: existing } = await supabase
      .from('sites')
      .select('id')
      .eq('custom_domain', domain.toLowerCase())
      .neq('id', siteId)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'This domain is already connected to another site' });
    }

    // 2. Register with Cloudflare Custom Hostnames API
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/custom_hostnames`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostname: domain.toLowerCase(),
          ssl: {
            method: 'http',
            type: 'dv',
            settings: {
              min_tls_version: '1.2',
            },
          },
        }),
      }
    );

    const cfData = await cfResponse.json();

    if (!cfData.success) {
      console.error('[domains/connect] Cloudflare error:', cfData.errors);
      const errorMsg = cfData.errors?.[0]?.message || 'Failed to register domain with Cloudflare';
      return res.status(502).json({ error: errorMsg });
    }

    const customHostnameId = cfData.result.id;

    // 3. Save to Supabase
    const { error: updateError } = await supabase
      .from('sites')
      .update({
        custom_domain: domain.toLowerCase(),
        custom_hostname_id: customHostnameId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siteId);

    if (updateError) {
      console.error('[domains/connect] Supabase update failed:', updateError);
      throw new Error(updateError.message);
    }

    console.log(`[domains/connect] Registered ${domain} -> hostname ID ${customHostnameId}`);

    return res.status(200).json({
      success: true,
      customHostnameId,
    });
  } catch (error: any) {
    console.error('[domains/connect] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to connect domain' });
  }
}
