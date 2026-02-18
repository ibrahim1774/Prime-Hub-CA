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
 * Checks for duplicates before inserting.
 */
export const migrateSiteToUser = async (site: SiteInstance, userId: string): Promise<void> => {
  // Check if already exists in Supabase
  const { data: existing } = await supabase
    .from('sites')
    .select('id, user_id')
    .eq('id', site.id)
    .maybeSingle();

  if (existing) {
    if (!existing.user_id) {
      // Site was deployed anonymously (post-payment before account creation) — claim it
      const { error } = await supabase
        .from('sites')
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq('id', site.id);
      if (error) console.error('[SiteService] Failed to claim site:', error);
      else console.log('[SiteService] Claimed anonymous site for user:', userId);
    } else {
      console.log('[SiteService] Site already exists in Supabase, skipping migration');
    }
    return;
  }

  // Save with user_id
  const siteWithUser = { ...site, user_id: userId };
  await saveSite(siteWithUser, userId);
  console.log('[SiteService] Site migrated to Supabase for user:', userId);
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
    domainOrderId: row.domain_order_id,
    subdomain: row.subdomain || undefined,
    lastPublishedAt: row.last_published_at ? new Date(row.last_published_at).getTime() : undefined,
  };
}
