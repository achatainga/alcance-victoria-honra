import ImageKit from 'imagekit';
import { VercelRequest, VercelResponse } from '@vercel/node';

const imagekit = new ImageKit({
    publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT || '',
});

export default function handler(_req: VercelRequest, res: VercelResponse) {
    // Add CORS headers for local development if needed, though Vercel handles this in production
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        const result = imagekit.getAuthenticationParameters();
        res.status(200).json(result);
    } catch (error) {
        console.error('ImageKit Auth Error:', error);
        res.status(500).json({ error: 'Failed to generate auth parameters' });
    }
}
