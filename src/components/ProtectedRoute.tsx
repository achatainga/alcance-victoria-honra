import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check if profile is complete (except for super_admin who might bypass)
    // We check if birthDate is missing.
    const isProfileComplete = user.birthDate && user.ministryType;

    // If profile incomplete AND we are not already on the completion page (to avoid loops, though this component is for protected routes)
    // Actually ProtectedRoute wraps the main layout. 
    // We need to allow access to /complete-profile WITHOUT this check if we wrap it? 
    // No, /complete-profile should be accessible to logged in users but NOT wrapped by this specific check if it causes a loop.
    // However, looking at App.tsx, /complete-profile is OUTSIDE the MainLayout but validation logic usually lives here.
    // Let's modify: If profile incomplete, redirect to /complete-profile.

    if (!isProfileComplete && window.location.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }

    return <Outlet />;
}
