import { createContext, useContext, useEffect, useState } from 'react';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { getToken } from 'firebase/messaging';
import { auth, googleProvider, db, messaging } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

interface UserProfile {
    uid: string;
    email: string | null;
    role: 'super_admin' | 'admin' | 'editor' | 'reader';
    displayName: string | null;
    photoURL: string | null;
    birthDate?: string;
    ministryType?: 'pastor' | 'lider' | 'varon-hogar' | 'varona-hogar' | 'congregante';
    phoneNumber?: string;
    fcmToken?: string;
}

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Check if user exists in Firestore
                const userRef = doc(db, 'users', firebaseUser.uid);
                const userSnap = await getDoc(userRef);

                let userData: UserProfile;

                if (userSnap.exists()) {
                    userData = userSnap.data() as UserProfile;
                } else {
                    // Create new user (default role: reader)

                    // SMART LINKING LOGIC: Check if member exists with this email
                    const membersRef = collection(db, 'members');
                    const q = query(membersRef, where('email', '==', firebaseUser.email));
                    const querySnapshot = await getDocs(q);

                    let linkedMemberData = {};

                    if (!querySnapshot.empty) {
                        const existingMemberDoc = querySnapshot.docs[0];
                        const memberData = existingMemberDoc.data();

                        // Copy data from Member to User Profile
                        linkedMemberData = {
                            birthDate: memberData.birthDate,
                            ministryType: memberData.type,
                            // Optionally phone, etc.
                        };

                        // Link Member to User
                        await updateDoc(doc(db, 'members', existingMemberDoc.id), {
                            linkedUserId: firebaseUser.uid
                        });
                    }

                    const newUser: UserProfile = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        role: 'reader', // Default role
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        ...linkedMemberData
                    };
                    await setDoc(userRef, newUser);
                    userData = newUser;
                }

                // --- SAVE FCM TOKEN ---
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        // We need to register SW here or rely on App.tsx registration? 
                        // It's cleaner to just get the token if registration exists, but let's be robust.
                        // Ideally App.tsx handles the initial registration. 
                        // But we can try getting the token.

                        // NOTE: We are importing messaging from ../lib/firebase
                        // We need to import getToken from firebase/messaging at the top

                        // Construct the SW URL with env vars (redundant but safe)
                        const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
                        ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].forEach(key => {
                            swUrl.searchParams.append(key, import.meta.env[`VITE_FIREBASE_${key.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase()}`]);
                        });

                        const registration = await navigator.serviceWorker.getRegistration();

                        if (registration) {
                            const token = await getToken(messaging, {
                                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                                serviceWorkerRegistration: registration
                            });

                            if (token) {
                                if (userData.fcmToken !== token) {
                                    await updateDoc(userRef, { fcmToken: token });
                                    userData.fcmToken = token;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error saving FCM token:", error);
                }

                setUser(userData);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
