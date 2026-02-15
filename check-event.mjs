import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

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

const eventId = 'mUrL6o5DiQnz4CxZBnIW';

const eventDoc = await getDoc(doc(db, 'honor_plans', eventId));
const eventData = eventDoc.data();
console.log('Event honoreeIds:', eventData.honoreeIds);
console.log('Event targetDate:', eventData.targetDate);

const membersSnap = await getDocs(collection(db, 'members'));
console.log('\nAll members:');
membersSnap.forEach(d => {
  const data = d.data();
  console.log(`${data.fullName}: birthDate=${data.birthDate}, ID=${d.id}`);
});

process.exit(0);
