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

    // Check if profile is complete
    const isProfileComplete = user.phoneNumber && user.birthDate;

    if (!isProfileComplete && window.location.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }

    return <Outlet />;
}
