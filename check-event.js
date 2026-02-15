import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { config } from 'dotenv';

config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const eventId = 'mUrL6o5DiQnz4CxZBnIW';

const eventDoc = await getDoc(doc(db, 'honor_plans', eventId));
console.log('Event data:', eventDoc.data());

const membersSnap = await getDocs(collection(db, 'members'));
console.log('\nMembers with birthDate:');
membersSnap.forEach(d => {
  const data = d.data();
  if (data.birthDate) {
    console.log(`${data.fullName}: ${data.birthDate} (ID: ${d.id})`);
  }
});

process.exit(0);
