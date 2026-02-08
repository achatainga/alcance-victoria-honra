import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { User, Calendar, Phone, Briefcase } from 'lucide-react';

export default function CompleteProfile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        birthDate: '',
        ministryType: 'varon',
        phoneNumber: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            // 1. Update User Profile
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                birthDate: formData.birthDate,
                ministryType: formData.ministryType,
                phoneNumber: formData.phoneNumber
            });

            // 2. Auto-create/Sync Member Record
            // We use the User UID as the document ID for the member to keep them linked 1:1 easily
            // or we can just add a new doc. Using UID is safer to prevent duplicates.
            const memberRef = doc(db, 'members', user.uid);
            await setDoc(memberRef, {
                fullName: user.displayName || 'Usuario Sin Nombre',
                type: formData.ministryType,
                birthDate: formData.birthDate,
                status: 'active',
                observaciones: `Auto-registrado via App. Tel: ${formData.phoneNumber}`,
                linkedUserId: user.uid
            }, { merge: true });

            toast.success('¡Perfil completado!');
            // Force reload or redirect to dashboard
            window.location.href = '/dashboard';
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar perfil');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                        <User className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Completa tu Perfil</h1>
                    <p className="text-slate-400 mt-2">Para continuar, necesitamos algunos datos básicos para la comunidad.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs uppercase text-slate-500 font-bold mb-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Fecha de Nacimiento
                        </label>
                        <input
                            type="date"
                            required
                            className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors"
                            value={formData.birthDate}
                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-slate-500 font-bold mb-1 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Tipo de Ministerio
                        </label>
                        <select
                            className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors"
                            value={formData.ministryType}
                            onChange={e => setFormData({ ...formData, ministryType: e.target.value })}
                        >
                            <option value="varon">Varón (Hogar)</option>
                            <option value="mujer">Mujer (Hogar)</option>
                            <option value="lider">Líder</option>
                            <option value="pastor">Pastor</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-slate-500 font-bold mb-1 flex items-center gap-2">
                            <Phone className="w-4 h-4" /> Teléfono (Opcional)
                        </label>
                        <input
                            type="tel"
                            className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors"
                            placeholder="+58 ..."
                            value={formData.phoneNumber}
                            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Guardando...' : 'Completar Registro'}
                    </button>
                </form>
            </div>
        </div>
    );
}
