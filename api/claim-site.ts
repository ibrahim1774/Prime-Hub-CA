import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { siteId, userId } = req.body;

  if (!siteId || !userId) {
    return res.status(400).json({ error: 'Missing siteId or userId' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, serviceRoleKey);

  try {
    // Only claim if user_id is currently null (don't steal someone else's site)
    const { error } = await supabase
      .from('sites')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', siteId)
      .is('user_id', null);

    if (error) {
      console.error('[claim-site] Failed:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[claim-site] Site ${siteId} claimed by user ${userId}`);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[claim-site] Error:', error);
    return res.status(500).json({ error: error.message || 'Claim failed' });
  }
}
