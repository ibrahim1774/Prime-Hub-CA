import { GeneratedSiteData, SiteInstance } from '../types.js';
import { supabase } from './supabaseService.js';

/**
 * Upload any remaining base64 images in site data to GCS.
 * Returns a new copy of the data with GCS URLs replacing base64.
 */
async function uploadSiteImages(data: GeneratedSiteData, projectName: string): Promise<GeneratedSiteData> {
  const deployData: GeneratedSiteData = JSON.parse(JSON.stringify(data));

  const uploadAsset = async (base64: string): Promise<string> => {
    const res = await fetch('/api/upload-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, projectName }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed (${res.status}): ${text.substring(0, 100) || 'No response body'}`);
    }
    const result = await res.json();
    return result.url;
  };

  // Upload hero image
  if (deployData.hero?.heroImage?.startsWith('data:')) {
    deployData.hero.heroImage = await uploadAsset(deployData.hero.heroImage);
  }

  // Upload value proposition image
  if (deployData.valueProposition?.image?.startsWith('data:')) {
    deployData.valueProposition.image = await uploadAsset(deployData.valueProposition.image);
  }

  // Upload who-we-help image
  if (deployData.whoWeHelp?.image?.startsWith('data:')) {
    deployData.whoWeHelp.image = await uploadAsset(deployData.whoWeHelp.image);
  }

  // Upload gallery images sequentially
  if (deployData.gallery?.images) {
    for (let i = 0; i < deployData.gallery.images.length; i++) {
      const img = deployData.gallery.images[i];
      if (img && img.startsWith('data:')) {
        deployData.gallery.images[i] = await uploadAsset(img);
      }
    }
  }

  return deployData;
}

/**
 * Deploy a site via the Cloudflare Worker pipeline:
 * 1. Upload base64 images to GCS
 * 2. Save site_data to Supabase (via server-side API)
 * 3. Purge Worker KV cache
 * Returns the live URL and subdomain.
 */
export const deploySite = async (
  site: SiteInstance,
  userId?: string
): Promise<{ url: string; subdomain: string; updatedData: GeneratedSiteData }> => {
  // 1. Upload any base64 images to GCS
  const projectName = site.data.contact.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  const cleanData = await uploadSiteImages(site.data, projectName);

  // Get user's auth token for server-side RLS authentication
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // 2. Call server-side deploy API (handles subdomain, Supabase upsert, cache purge)
  const response = await fetch('/api/deploy-site', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: site.id,
      siteData: cleanData,
      formInputs: site.formInputs,
      userId,
      token,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Deployment failed');
  }

  const { url, subdomain } = await response.json();
  return { url, subdomain, updatedData: cleanData };
};
