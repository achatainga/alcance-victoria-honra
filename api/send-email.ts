import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (Singleton)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        }),
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { subject, message, recipientRoles } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ error: 'Missing subject or message' });
        }

        const db = admin.firestore();
        let usersQuery: any = db.collection('users');

        if (recipientRoles && recipientRoles.length > 0) {
            usersQuery = usersQuery.where('role', 'in', recipientRoles);
        }

        const usersSnap = await usersQuery.get();
        const emails: string[] = [];

        usersSnap.forEach((doc: any) => {
            const data = doc.data();
            if (data.email) {
                emails.push(data.email);
            }
        });

        if (emails.length === 0) {
            return res.status(200).json({ message: 'No recipients found.' });
        }

        // NOTE: Here you would integrate with an email provider like Resend, Mailgun, or Nodemailer.
        // For now, since we don't have SMTP credentials, we will log the action and return success.
        console.log(`[EMAIL SIMULATION] To: ${emails.join(', ')} | Subject: ${subject}`);

        // Example with Resend (if you add the API KEY later):
        // await resend.emails.send({ from: 'onboarding@resend.dev', to: emails, subject, html: message });

        return res.status(200).json({
            success: true,
            recipientCount: emails.length,
            message: 'Email sending triggered (Simulated if no provider configured).'
        });

    } catch (error) {
        console.error('Error in send-email:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
