import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Admin from './pages/Admin';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
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
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
