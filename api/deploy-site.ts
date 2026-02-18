import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;

function createSupabaseClient(userToken?: string) {
  // Prefer service role key (bypasses RLS entirely)
  if (serviceRoleKey) {
    return createClient(supabaseUrl, serviceRoleKey);
  }
  // Fall back to anon key with user's auth token (RLS-compliant)
  if (userToken) {
    return createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${userToken}` } },
    });
  }
  // Last resort: anon key without auth (for anonymous deploys)
  return createClient(supabaseUrl, anonKey);
}

function generateSubdomain(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

async function getUniqueSubdomain(companyName: string, siteId: string, supabase: any): Promise<string> {
  // First check if this site already has a subdomain
  const { data: existing } = await supabase
    .from('sites')
    .select('subdomain')
    .eq('id', siteId)
    .maybeSingle();

  if (existing?.subdomain) {
    return existing.subdomain;
  }

  // Generate a new unique subdomain
  const base = generateSubdomain(companyName);
  if (!base) {
    return `site-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // Check if the base subdomain is available
  const { data: taken } = await supabase
    .from('sites')
    .select('id')
    .eq('subdomain', base)
    .maybeSingle();

  if (!taken) return base;

  // Append random 4-digit suffix
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { siteId, siteData, formInputs, userId, token } = req.body;

  if (!siteId || !siteData) {
    return res.status(400).json({ error: 'Missing siteId or siteData' });
  }

  const supabase = createSupabaseClient(token);

  try {
    // 1. Generate unique subdomain
    const companyName = siteData.contact?.companyName || 'site';
    const subdomain = await getUniqueSubdomain(companyName, siteId, supabase);
    const deployedUrl = `https://${subdomain}.ablarme.com`;

    // 2. Upsert to Supabase
    const { error: upsertError } = await supabase
      .from('sites')
      .upsert({
        id: siteId,
        user_id: userId || null,
        company_name: companyName,
        industry: formInputs?.industry || '',
        service_area: siteData.contact?.location || '',
        phone: siteData.contact?.phone || '',
        brand_colour: formInputs?.brandColor || '#2563eb',
        site_data: siteData,
        subdomain,
        deployed_url: deployedUrl,
        deployment_status: 'deployed',
        last_published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('[deploy-site] Supabase upsert failed:', upsertError);
      throw new Error(`Database save failed: ${upsertError.message}`);
    }

    // 3. Purge Worker KV cache
    const PURGE_SECRET = process.env.PURGE_SECRET;
    if (PURGE_SECRET) {
      try {
        await fetch('https://ablarme.com/api/purge-cache', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Purge-Secret': PURGE_SECRET,
          },
          body: JSON.stringify({ subdomain }),
        });
      } catch (purgeErr) {
        console.warn('[deploy-site] Cache purge failed (non-fatal):', purgeErr);
      }
    }

    console.log(`[deploy-site] Deployed ${companyName} at ${deployedUrl}`);
    return res.status(200).json({ url: deployedUrl, subdomain });
  } catch (error: any) {
    console.error('[deploy-site] Error:', error);
    return res.status(500).json({ error: error.message || 'Deployment failed' });
  }
}
