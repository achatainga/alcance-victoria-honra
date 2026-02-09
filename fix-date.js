// Run: node fix-date.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
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

// Corregir fecha inválida - cambiar a fecha válida
await updateDoc(doc(db, 'honor_plans', '1DIGjFgefZC2nc2TDXxK'), {
  targetDate: '2025-05-22'  // Ajusta a la fecha correcta
});

console.log('✅ Fecha corregida');
