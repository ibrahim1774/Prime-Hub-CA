import { SiteRow, Env } from './types';

export async function fetchSiteBySubdomain(subdomain: string, env: Env): Promise<SiteRow | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/sites?subdomain=eq.${encodeURIComponent(subdomain)}&limit=1`;
  return fetchSite(url, env);
}

export async function fetchSiteByCustomDomain(domain: string, env: Env): Promise<SiteRow | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/sites?custom_domain=eq.${encodeURIComponent(domain)}&limit=1`;
  return fetchSite(url, env);
}

async function fetchSite(url: string, env: Env): Promise<SiteRow | null> {
  const response = await fetch(url, {
    headers: {
      'apikey': env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Supabase error: ${response.status} ${await response.text()}`);
    return null;
  }

  const rows: SiteRow[] = await response.json();
  return rows.length > 0 ? rows[0] : null;
}
