// Run: node debug-dates.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf-8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if (key) acc[key.trim()] = val.join('=').trim();
    return acc;
  }, {});

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);

const plans = await getDocs(collection(db, 'honor_plans'));
console.log('\n=== HONOR PLANS ===');
plans.docs.forEach(doc => {
  const data = doc.data();
  console.log(`${doc.id}: targetDate="${data.targetDate}" (${typeof data.targetDate})`);
});

const members = await getDocs(collection(db, 'members'));
console.log('\n=== MEMBERS ===');
members.docs.forEach(doc => {
  const data = doc.data();
  console.log(`${doc.id}: birthDate="${data.birthDate}" (${typeof data.birthDate})`);
});
