import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { siteId, customHostnameId } = req.body;

  if (!siteId || !customHostnameId) {
    return res.status(400).json({ error: 'Missing siteId or customHostnameId' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, serviceRoleKey);

  try {
    // 1. Get the current custom_domain before clearing (for cache purge)
    const { data: siteRow } = await supabase
      .from('sites')
      .select('custom_domain')
      .eq('id', siteId)
      .single();

    const domainToPurge = siteRow?.custom_domain;

    // 2. Delete from Cloudflare
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${customHostnameId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const cfData = await cfResponse.json();

    if (!cfData.success) {
      // Log but don't fail — the hostname may already be gone
      console.warn('[domains/remove] Cloudflare delete warning:', cfData.errors);
    }

    // 3. Clear domain fields in Supabase
    const { error: updateError } = await supabase
      .from('sites')
      .update({
        custom_domain: null,
        custom_hostname_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siteId);

    if (updateError) {
      console.error('[domains/remove] Supabase update failed:', updateError);
      throw new Error(updateError.message);
    }

    // 4. Purge KV cache for the custom domain
    if (domainToPurge && process.env.PURGE_SECRET) {
      try {
        await fetch('https://ablarme.com/api/purge-cache', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Purge-Secret': process.env.PURGE_SECRET,
          },
          body: JSON.stringify({ custom_domain: domainToPurge }),
        });
      } catch (purgeErr) {
        console.warn('[domains/remove] Cache purge failed (non-fatal):', purgeErr);
      }
    }

    console.log(`[domains/remove] Removed ${domainToPurge} (hostname ID ${customHostnameId})`);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[domains/remove] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to remove domain' });
  }
}
