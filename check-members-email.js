import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function checkMembers() {
    const membersRef = collection(db, 'members');
    const snapshot = await getDocs(membersRef);
    
    console.log('\n=== MEMBERS EMAIL CHECK ===');
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`${doc.id}: email="${data.email || 'MISSING'}" name="${data.fullName}"`);
    });
}

checkMembers().then(() => process.exit(0));
