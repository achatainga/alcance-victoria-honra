import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (Singleton)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Handle private key line breaks for Vercel env vars
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        }),
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { title, body, topic } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Missing title or body' });
        }

        // 2. Fetch all user tokens from Firestore
        // Note: For production with >1000 users, use Topic Subscription instead.
        // For now, fetching tokens is safer to ensure delivery without client-side topic logic.
        const db = admin.firestore();
        const usersSnap = await db.collection('users').get();

        const tokens: string[] = [];
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.fcmToken) {
                tokens.push(data.fcmToken);
            }
        });

        if (tokens.length === 0) {
            return res.status(200).json({ message: 'No tokens found to send.' });
        }

        // 3. Send Multicast Message
        const message = {
            notification: {
                title,
                body,
            },
            tokens: tokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        // Optional: Cleanup invalid tokens
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            console.log('Failed tokens:', failedTokens);
            // Logic to remove bad tokens could go here
        }

        return res.status(200).json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount
        });

    } catch (error) {
        console.error('Error sending push:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) });
    }
}
