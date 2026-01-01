import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AssetUploader } from '../lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log(`[API] Upload request received for project: ${req.body?.projectName}`);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { base64, projectName } = req.body;
    if (!base64 || !projectName) {
        return res.status(400).json({ error: 'Missing base64 or projectName' });
    }

    try {
        const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
        const GCS_CREDENTIALS = process.env.GCS_CREDENTIALS;

        if (!GCS_BUCKET_NAME) throw new Error('Missing GCS_BUCKET_NAME environment variable');

        let credentials;
        if (GCS_CREDENTIALS) {
            try {
                credentials = JSON.parse(GCS_CREDENTIALS);
                console.log('[API] Using credentials from GCS_CREDENTIALS env var');
            } catch (e) {
                console.error('[API] Failed to parse GCS_CREDENTIALS JSON', e);
            }
        }

        const uploader = new AssetUploader(GCS_BUCKET_NAME, credentials);

        // Extract base64 data
        const parts = base64.split(',');
        const base64Data = parts.length > 1 ? parts[1] : parts[0];
        const buffer = Buffer.from(base64Data, 'base64');

        console.log(`[API] Uploading buffer of size ${buffer.length} bytes...`);

        // Generate a unique filename
        const filename = `assets/image-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

        // Upload directly to GCS
        const publicUrl = await uploader.uploadBuffer(buffer, filename, projectName);

        return res.status(200).json({ success: true, url: publicUrl, filename });
    } catch (error: any) {
        console.error('[API] Upload Error:', error);
        return res.status(500).json({ error: error.message || 'Upload failed' });
    }
}
