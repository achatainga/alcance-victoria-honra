import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Admin from './pages/Admin';
import HonorAdmin from './pages/AdminHonor';
import HonorEvent from './pages/HonorEvent';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useEffect } from 'react';
import { messaging } from './lib/firebase';
import { getToken } from 'firebase/messaging';
// import { toast } from 'react-toastify';

export default function App() {
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Construct the SW URL with env vars
          const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
          swUrl.searchParams.append('apiKey', import.meta.env.VITE_FIREBASE_API_KEY);
          swUrl.searchParams.append('authDomain', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
          swUrl.searchParams.append('projectId', import.meta.env.VITE_FIREBASE_PROJECT_ID);
          swUrl.searchParams.append('storageBucket', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
          swUrl.searchParams.append('messagingSenderId', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
          swUrl.searchParams.append('appId', import.meta.env.VITE_FIREBASE_APP_ID);

          const registration = await navigator.serviceWorker.register(swUrl.toString());

          const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration
          });
          console.log('FCM Token:', token);
          // TODO: Save token to user profile in Firestore
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    requestPermission();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/members" element={<Members />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/honor-admin" element={<HonorAdmin />} />
              <Route path="/honor/:id" element={<HonorEvent />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
