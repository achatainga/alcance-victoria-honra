import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    Users,
    ShieldCheck,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';

export default function MainLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
        { to: '/members', label: 'Miembros', icon: Users },
    ];

    if (user?.role === 'super_admin' || user?.role === 'admin') {
        navItems.push({ to: '/admin', label: 'Admin', icon: ShieldCheck });
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen sticky top-0">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold text-amber-500 tracking-wider">ALCANCE</h1>
                    <p className="text-slate-500 text-xs tracking-[0.2em]">VICTORIA HONRA</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-amber-500 text-slate-900 font-bold'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <img
                            src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`}
                            alt="User"
                            className="w-10 h-10 rounded-full border border-slate-700"
                        />
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{user?.displayName}</p>
                            <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 justify-center py-2 text-slate-400 hover:text-red-400 text-sm transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Mobile Header */}
                <header className="md:hidden bg-slate-900/90 backdrop-blur border-b border-slate-800 p-4 sticky top-0 z-20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h1 className="font-bold text-white">Alcance Honra</h1>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300">
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </header>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-10 bg-slate-950 pt-20 px-6 md:hidden">
                        <nav className="space-y-2">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-4 rounded-xl text-lg ${isActive
                                            ? 'bg-amber-500 text-slate-900 font-bold'
                                            : 'text-slate-400 border border-slate-800'
                                        }`
                                    }
                                >
                                    <item.icon className="w-6 h-6" />
                                    {item.label}
                                </NavLink>
                            ))}
                            <button
                                onClick={handleLogout}
                                className="w-full mt-8 flex items-center gap-2 justify-center py-4 bg-red-500/10 text-red-400 rounded-xl"
                            >
                                <LogOut className="w-5 h-5" />
                                Cerrar Sesión
                            </button>
                        </nav>
                    </div>
                )}

                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
