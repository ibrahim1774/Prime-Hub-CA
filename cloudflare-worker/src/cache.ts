import { Env } from './types';

const CACHE_TTL = 60; // seconds

export async function getCachedHtml(key: string, env: Env): Promise<string | null> {
  return env.SITE_CACHE.get(`site:${key}`);
}

export async function setCachedHtml(key: string, html: string, env: Env): Promise<void> {
  await env.SITE_CACHE.put(`site:${key}`, html, {
    expirationTtl: CACHE_TTL,
  });
}

export async function purgeCache(key: string, env: Env): Promise<void> {
  await env.SITE_CACHE.delete(`site:${key}`);
}
