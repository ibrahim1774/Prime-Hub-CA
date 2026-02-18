import { SiteInstance } from '../types.js';
import { saveSiteInstance, getAllSites } from './storageService.js';
import { supabase } from './supabaseService.js';

function generateSubdomain(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 63);
}

/**
 * Save site to IndexedDB first (instant), then Supabase (async, fire-and-forget) if userId provided.
 */
export const saveSite = async (site: SiteInstance, userId?: string): Promise<void> => {
  // Always save to IndexedDB first (instant, local)
  await saveSiteInstance(site);

  if (userId) {
    // Fire-and-forget Supabase upsert
    supabase
      .from('sites')
      .upsert({
        id: site.id,
        user_id: userId,
        company_name: site.data.contact.companyName,
        industry: site.formInputs?.industry || '',
        service_area: site.data.contact.location,
        phone: site.data.contact.phone,
        brand_colour: site.formInputs?.brandColor || '#2563eb',
        site_data: site.data,
        deployed_url: site.deployedUrl || null,
        deployment_status: site.deploymentStatus || 'draft',
        custom_domain: site.customDomain || null,
        custom_hostname_id: site.customHostnameId || null,
        domain_order_id: site.domainOrderId || null,
        subdomain: generateSubdomain(site.data.contact.companyName),
        updated_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error('[SiteService] Supabase save failed:', error);
        else console.log('[SiteService] Saved to Supabase');
      });
  }
};

/**
 * Load user's site. If authenticated, try Supabase first; fallback to IndexedDB.
 */
export const loadUserSite = async (userId?: string): Promise<SiteInstance | null> => {
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        return mapSupabaseToSiteInstance(data);
      }
    } catch (err) {
      console.error('[SiteService] Supabase load failed, falling back to IndexedDB:', err);
    }
  }

  // Fallback to IndexedDB
  const sites = await getAllSites();
  if (sites.length === 0) return null;
  return sites.sort((a, b) => b.lastSaved - a.lastSaved)[0];
};

/**
 * Migrate a local IndexedDB site to Supabase for a newly signed-up user.
 * Uses a server-side endpoint that has the service role key to bypass RLS,
 * since the client-side anon key can't access rows where user_id is null.
 */
export const migrateSiteToUser = async (site: SiteInstance, userId: string): Promise<void> => {
  try {
    // Use server-side endpoint (has service role key, bypasses RLS)
    const response = await fetch('/api/claim-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: site.id, userId }),
    });

    if (response.ok) {
      console.log('[SiteService] Site claimed for user:', userId);
    } else {
      const err = await response.json();
      console.error('[SiteService] Server-side claim failed:', err);
    }
  } catch (err) {
    console.error('[SiteService] Migration failed:', err);
  }

  // Always save to IndexedDB with user association
  await saveSiteInstance({ ...site, user_id: userId });
};

/**
 * Convert a Supabase row to a SiteInstance.
 */
function mapSupabaseToSiteInstance(row: any): SiteInstance {
  return {
    id: row.id,
    data: row.site_data,
    lastSaved: new Date(row.updated_at).getTime(),
    user_id: row.user_id,
    formInputs: {
      industry: row.industry || '',
      companyName: row.company_name || '',
      location: row.service_area || '',
      phone: row.phone || '',
      brandColor: row.brand_colour || '#2563eb',
    },
    deployedUrl: row.deployed_url,
    deploymentStatus: row.deployment_status || 'draft',
    customDomain: row.custom_domain,
    customHostnameId: row.custom_hostname_id || undefined,
    domainOrderId: row.domain_order_id,
    subdomain: row.subdomain || undefined,
    lastPublishedAt: row.last_published_at ? new Date(row.last_published_at).getTime() : undefined,
  };
}
