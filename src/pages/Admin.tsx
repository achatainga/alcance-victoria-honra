import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Shield } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface UserProfile {
    uid: string;
    email: string;
    role: 'super_admin' | 'admin' | 'editor' | 'reader';
    displayName: string;
    photoURL: string;
}

export default function Admin() {
    const { user } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('email'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as UserProfile[];
            setUsers(data);
        });
        return () => unsubscribe();
    }, []);

    const handleRoleChange = async (uid: string, newRole: string) => {
        try {
            await updateDoc(doc(db, 'users', uid), { role: newRole });
            toast.success('Rol actualizado');
        } catch (error) {
            toast.error('Error al actualizar rol');
        }
    };

    if (user?.role !== 'super_admin' && user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-amber-500" />
                Gestión de Roles
            </h1>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Rol Actual</th>
                                <th className="px-6 py-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {users.map((u) => (
                                <tr key={u.uid} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <img
                                            src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`}
                                            className="w-8 h-8 rounded-full"
                                            alt=""
                                        />
                                        <span className="font-medium text-white">{u.displayName}</span>
                                    </td>
                                    <td className="px-6 py-4">{u.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${u.role === 'super_admin' ? 'bg-amber-500/20 text-amber-500' :
                                            u.role === 'admin' ? 'bg-purple-500/20 text-purple-500' :
                                                u.role === 'editor' ? 'bg-blue-500/20 text-blue-500' :
                                                    'bg-slate-700 text-slate-300'
                                            }`}>
                                            {u.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white outline-none focus:border-amber-500"
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                                            disabled={user.role !== 'super_admin' && u.role === 'super_admin'}
                                        >
                                            <option value="reader">Reader</option>
                                            <option value="editor">Editor</option>
                                            <option value="admin">Admin</option>
                                            {user.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
