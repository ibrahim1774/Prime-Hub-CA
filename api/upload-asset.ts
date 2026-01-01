import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AssetUploader } from '../lib/storage.js';

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

        if (!GCS_BUCKET_NAME) {
            console.error('[API] Missing GCS_BUCKET_NAME');
            return res.status(500).json({ error: 'Missing GCS_BUCKET_NAME environment variable' });
        }

        let credentials;
        if (GCS_CREDENTIALS) {
            try {
                credentials = JSON.parse(GCS_CREDENTIALS);
                console.log('[API] Using credentials from GCS_CREDENTIALS env var');
            } catch (e: any) {
                console.error('[API] Failed to parse GCS_CREDENTIALS JSON:', e.message);
            }
        } else {
            console.warn('[API] GCS_CREDENTIALS env var is missing.');
        }

        const uploader = new AssetUploader(GCS_BUCKET_NAME, credentials);

        // Extract base64 data
        const parts = base64.split(',');
        const base64Data = parts.length > 1 ? parts[1] : parts[0];

        let buffer;
        try {
            buffer = Buffer.from(base64Data, 'base64');
            console.log(`[API] Created buffer of size ${buffer.length} bytes`);
        } catch (e: any) {
            console.error('[API] Failed to create buffer:', e.message);
            return res.status(400).json({ error: 'Invalid base64 data' });
        }

        // Generate a unique filename
        const filename = `assets/image-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

        console.log(`[API] Uploading to GCS: ${filename}...`);
        const publicUrl = await uploader.uploadBuffer(buffer, filename, projectName);

        console.log(`[API] Upload successful: ${publicUrl}`);
        return res.status(200).json({ success: true, url: publicUrl, filename });
    } catch (error: any) {
        console.error('[API] CRITICAL Upload Error:', error);
        return res.status(500).json({
            error: error.message || 'Upload failed',
            details: error.toString(),
            stack: error.stack
        });
    }
}
