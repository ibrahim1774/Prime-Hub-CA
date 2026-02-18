import { Env } from './types';
import { fetchSiteBySubdomain, fetchSiteByCustomDomain } from './supabase';
import { getCachedHtml, setCachedHtml, purgeCache } from './cache';
import { renderSiteHtml, render404Page } from './renderer';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Allow ACME challenge for SSL certificate validation
    if (url.pathname.startsWith("/.well-known/")) {
      return new Response("", { status: 200 });
    }

    // Root domain redirect
    if (hostname === 'ablarme.com' || hostname === 'www.ablarme.com') {
      return Response.redirect(env.MAIN_APP_URL, 301);
    }

    // Cache purge endpoint (works on any hostname)
    if (url.pathname === '/api/purge-cache' && request.method === 'POST') {
      return handlePurgeCache(request, env);
    }

    // Subdomain routing
    if (hostname.endsWith('.ablarme.com')) {
      const subdomain = hostname.replace('.ablarme.com', '');
      return handleSiteRequest(subdomain, 'subdomain', env, ctx);
    }

    // Custom domain routing
    return handleSiteRequest(hostname, 'custom_domain', env, ctx);
  },
};

async function handleSiteRequest(
  lookupValue: string,
  lookupType: 'subdomain' | 'custom_domain',
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  // 1. Check KV cache
  const cacheKey = lookupValue;
  const cachedHtml = await getCachedHtml(cacheKey, env);

  if (cachedHtml) {
    return new Response(cachedHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'X-Cache': 'HIT',
      },
    });
  }

  // 2. Query Supabase
  const site = lookupType === 'subdomain'
    ? await fetchSiteBySubdomain(lookupValue, env)
    : await fetchSiteByCustomDomain(lookupValue, env);

  // 3. Not found
  if (!site) {
    return new Response(render404Page(env.MAIN_APP_URL), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 4. Render HTML
  const brandColour = site.brand_colour || '#2563eb';
  const siteData = site.site_data;

  // Check for sections_config in site_data (future feature)
  const sectionsConfig = (siteData as any).sections_config || undefined;

  const html = renderSiteHtml(siteData, brandColour, sectionsConfig);

  // 5. Store in KV cache (non-blocking)
  ctx.waitUntil(setCachedHtml(cacheKey, html, env));

  // 6. Return response
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Cache': 'MISS',
    },
  });
}

async function handlePurgeCache(request: Request, env: Env): Promise<Response> {
  // Validate secret
  const secret = request.headers.get('X-Purge-Secret');
  if (!secret || secret !== env.PURGE_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { subdomain?: string; custom_domain?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const purged: string[] = [];

  if (body.subdomain) {
    await purgeCache(body.subdomain, env);
    purged.push(body.subdomain);
  }

  if (body.custom_domain) {
    await purgeCache(body.custom_domain, env);
    purged.push(body.custom_domain);
  }

  if (purged.length === 0) {
    return Response.json({ error: 'Provide subdomain or custom_domain to purge' }, { status: 400 });
  }

  return Response.json({ success: true, purged });
}
