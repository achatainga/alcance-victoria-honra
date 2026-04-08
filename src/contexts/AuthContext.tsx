import { createContext, useContext, useEffect, useState } from 'react';
import {
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { getToken } from 'firebase/messaging';
import { auth, googleProvider, db, messaging } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

// Force account selection on every login + request birthday scope
googleProvider.setCustomParameters({
    prompt: 'select_account'
});
googleProvider.addScope('https://www.googleapis.com/auth/user.birthday.read');

// Fetch birthday from Google People API
async function fetchGoogleBirthday(accessToken: string): Promise<string | null> {
    try {
        const response = await fetch('https://people.googleapis.com/v1/people/me?personFields=birthdays', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await response.json();
        const birthday = data.birthdays?.find((b: any) => b.metadata?.primary)?.date;
        if (birthday?.year && birthday?.month && birthday?.day) {
            return `${birthday.year}-${String(birthday.month).padStart(2, '0')}-${String(birthday.day).padStart(2, '0')}`;
        }
    } catch (error) {
        console.warn('Could not fetch birthday from Google:', error);
    }
    return null;
}

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
        let mounted = true;

        const initAuth = async () => {
            try {
                // Handle redirect result first
                console.log('Checking redirect result...');
                console.log('Current URL:', window.location.href);
                console.log('LocalStorage keys:', Object.keys(localStorage));
                
                const result = await getRedirectResult(auth);
                
                if (result && mounted) {
                    console.log('✅ Redirect result found:', result.user.email);
                    // Try to get birthday from Google People API
                    const { GoogleAuthProvider } = await import('firebase/auth');
                    const googleCredential = GoogleAuthProvider.credentialFromResult(result);
                    
                    if (googleCredential?.accessToken) {
                        const birthDate = await fetchGoogleBirthday(googleCredential.accessToken);
                        if (birthDate) {
                            try {
                                const userRef = doc(db, 'users', result.user.uid);
                                await updateDoc(userRef, { birthDate });
                                console.log('Birthday updated:', birthDate);
                            } catch (error) {
                                console.warn('Could not update birthDate:', error);
                            }
                        }
                    }
                } else {
                    console.log('❌ No redirect result');
                }
            } catch (error) {
                console.error('Error handling redirect:', error);
            }

            // Now set up auth state listener
            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
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

                        // Link Member to User + Sync email
                        await updateDoc(doc(db, 'members', existingMemberDoc.id), {
                            linkedUserId: firebaseUser.uid,
                            email: firebaseUser.email
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
                    // Skip if notifications not supported
                    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
                        console.log('Notifications not supported, skipping FCM token');
                        setUser(userData);
                        setLoading(false);
                        return;
                    }

                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        const registration = await navigator.serviceWorker.getRegistration();

                        if (registration && messaging) {
                            const token = await getToken(messaging, {
                                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                                serviceWorkerRegistration: registration
                            });

                            if (token && userData.fcmToken !== token) {
                                await updateDoc(userRef, { fcmToken: token });
                                userData.fcmToken = token;
                            }
                        }
                    }
                } catch (error) {
                    console.warn("FCM token not available:", error);
                    // Continue without FCM token
                }

                    setUser(userData);
                } catch (error) {
                    console.error('Error loading user data:', error);
                    // If Firestore fails, sign out the user
                    await signOut(auth);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
            });

            return unsubscribe;
        };

        initAuth().then(unsubscribe => {
            if (mounted && unsubscribe) {
                return () => {
                    mounted = false;
                    unsubscribe();
                };
            }
        });

        return () => {
            mounted = false;
        };
    }, []);

    const signInWithGoogle = async () => {
        try {
            await signInWithRedirect(auth, googleProvider);
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
