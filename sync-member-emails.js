import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key) env[key.trim()] = values.join('=').trim();
});

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncEmails() {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = {};
    usersSnapshot.forEach(doc => {
        const data = doc.data();
        users[doc.id] = data.email;
    });

    // Get all members
    const membersSnapshot = await getDocs(collection(db, 'members'));
    
    console.log('\n=== SYNCING EMAILS ===');
    for (const memberDoc of membersSnapshot.docs) {
        const memberData = memberDoc.data();
        const linkedUserId = memberData.linkedUserId;
        
        if (linkedUserId && users[linkedUserId] && !memberData.email) {
            const email = users[linkedUserId];
            await updateDoc(doc(db, 'members', memberDoc.id), { email });
            console.log(`✅ Updated ${memberData.fullName}: ${email}`);
        } else if (memberData.email) {
            console.log(`⏭️  ${memberData.fullName}: already has email`);
        } else {
            console.log(`⚠️  ${memberData.fullName}: no linked user`);
        }
    }
}

syncEmails().then(() => process.exit(0));
