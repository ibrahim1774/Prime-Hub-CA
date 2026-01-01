import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AssetUploader } from '../lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { base64, projectName } = req.body;
    if (!base64 || !projectName) {
        return res.status(400).json({ error: 'Missing base64 or projectName' });
    }

    try {
        const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
        if (!GCS_BUCKET_NAME) throw new Error('Missing GCS_BUCKET_NAME');

        const uploader = new AssetUploader(GCS_BUCKET_NAME);

        // Extract base64 data
        const base64Data = base64.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');

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
