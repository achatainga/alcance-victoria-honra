import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBTKlPkgMYtmEcmCPZFVn1IbNCzND9lmLU",
    authDomain: "alcance-victoria-honra.firebaseapp.com",
    projectId: "alcance-victoria-honra",
    storageBucket: "alcance-victoria-honra.firebasestorage.app",
    messagingSenderId: "103546248777",
    appId: "1:103546248777:web:0434d14ac7f4670d7ce998",
    measurementId: "G-9H2JHKTFJ2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
