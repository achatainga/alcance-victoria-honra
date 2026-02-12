import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
    UserPlus,
    Search,
    Trash2,
    Edit,
    Filter,
    Mail,
    Phone,
    Link2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface Member {
    id: string;
    fullName: string;
    email?: string; // New email field for Smart Linking
    phoneNumber?: string; // Nuevo campo de teléfono
    type: 'pastor' | 'lider' | 'varon-hogar' | 'varona-hogar' | 'congregante';
    birthDate: string; // YYYY-MM-DD
    status: 'activo' | 'inactivo' | 'graduado' | 'en-proceso' | 'retirado';
    observaciones?: string;
}

export default function Members() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Omit<Member, 'id'>>({
        fullName: '',
        email: '',
        phoneNumber: '',
        type: 'congregante',
        birthDate: '',
        status: 'activo',
        observaciones: ''
    });

    useEffect(() => {
        const q = query(collection(db, 'members'), orderBy('fullName'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Member[];
            setMembers(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDoc(doc(db, 'members', editingId), formData);
                toast.success('Miembro actualizado');
            } else {
                await addDoc(collection(db, 'members'), formData);
                toast.success('Miembro agregado');
            }
            setShowModal(false);
            resetForm();
        } catch (error) {
            toast.error('Error al guardar');
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este miembro?')) return;
        try {
            await deleteDoc(doc(db, 'members', id));
            toast.success('Miembro eliminado');
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const handleEdit = (member: Member) => {
        setFormData({
            fullName: member.fullName,
            email: member.email || '',
            phoneNumber: member.phoneNumber || '',
            type: member.type,
            birthDate: member.birthDate,
            status: member.status,
            observaciones: member.observaciones || ''
        });
        setEditingId(member.id);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            fullName: '',
            email: '',
            phoneNumber: '',
            type: 'congregante',
            birthDate: '',
            status: 'activo',
            observaciones: ''
        });
        setEditingId(null);
    };

    // Helper to get allowed statuses based on type
    const getAllowedStatuses = (type: string) => {
        if (type === 'varon-hogar' || type === 'varona-hogar') {
            return ['en-proceso', 'graduado', 'retirado'];
        }
        return ['activo', 'inactivo'];
    };

    // Update status when type changes if current status is invalid
    const handleTypeChange = (newType: any) => {
        const allowed = getAllowedStatuses(newType);
        const newStatus = allowed.includes(formData.status) ? formData.status : allowed[0];
        setFormData({ ...formData, type: newType, status: newStatus as any });
    };

    const filteredMembers = members.filter(m => {
        const matchesSearch = m.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || m.type === typeFilter;
        return matchesSearch && matchesType;
    });

    // Detect potential duplicates
    const detectDuplicates = () => {
        const groups: Member[][] = [];
        const processed = new Set<string>();

        members.forEach(m1 => {
            if (processed.has(m1.id)) return;
            const duplicates = [m1];
            
            members.forEach(m2 => {
                if (m1.id === m2.id || processed.has(m2.id)) return;
                
                // Same email
                if (m1.email && m2.email && m1.email === m2.email) {
                    duplicates.push(m2);
                    processed.add(m2.id);
                }
                // Similar name (simple check)
                else if (m1.fullName.toLowerCase() === m2.fullName.toLowerCase()) {
                    duplicates.push(m2);
                    processed.add(m2.id);
                }
            });

            if (duplicates.length > 1) {
                groups.push(duplicates);
                processed.add(m1.id);
            }
        });

        return groups;
    };

    const mergeMember = async (keepId: string, removeId: string) => {
        if (!confirm('¿Fusionar estas cuentas? Se mantendrá la primera y se eliminará la segunda.')) return;
        
        try {
            const keep = members.find(m => m.id === keepId)!;
            const remove = members.find(m => m.id === removeId)!;

            // Merge data (keep non-empty values)
            const merged = {
                fullName: keep.fullName || remove.fullName,
                email: keep.email || remove.email,
                phoneNumber: keep.phoneNumber || remove.phoneNumber,
                type: keep.type,
                birthDate: keep.birthDate || remove.birthDate,
                status: keep.status,
                observaciones: [keep.observaciones, remove.observaciones].filter(Boolean).join(' | ')
            };

            await updateDoc(doc(db, 'members', keepId), merged);
            await deleteDoc(doc(db, 'members', removeId));
            
            toast.success('Cuentas fusionadas exitosamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al fusionar cuentas');
        }
    };

    const duplicateGroups = detectDuplicates();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    Gestión de Miembros
                    <span className="text-sm font-normal text-slate-500 bg-slate-900 px-2 py-1 rounded-full border border-slate-800">
                        {filteredMembers.length}
                    </span>
                </h1>
                {isAdmin && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSyncModal(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors"
                        >
                            <Link2 className="w-5 h-5" />
                            Account Sync
                        </button>
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors"
                        >
                            <UserPlus className="w-5 h-5" />
                            Nuevo Miembro
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-slate-200 outline-none focus:border-amber-500"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    <Filter className="w-4 h-4 text-slate-500" />
                    {['all', 'pastor', 'lider', 'varon-hogar', 'varona-hogar', 'congregante'].map(type => (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={`px-3 py-1.5 rounded-lg text-sm capitalize whitespace-nowrap border ${typeFilter === type
                                ? 'bg-slate-800 border-amber-500 text-amber-500'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                        >
                            {type === 'all' ? 'Todos' : type.replace('-', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="grid gap-3">
                {loading ? (
                    <p className="text-slate-500 text-center py-8">Cargando...</p>
                ) : filteredMembers.map(member => (
                    <div key={member.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-slate-700 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${member.type === 'pastor' ? 'bg-purple-500/20 text-purple-400' :
                                member.type === 'lider' ? 'bg-blue-500/20 text-blue-400' :
                                    member.type === 'varona-hogar' ? 'bg-pink-500/20 text-pink-400' :
                                        'bg-slate-700 text-slate-300'
                                }`}>
                                {member.fullName[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{member.fullName}</h3>
                                <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                                    <span className="capitalize bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">{member.type.replace('-', ' ')}</span>
                                    <span className={`capitalize px-2 py-0.5 rounded border ${member.status === 'activo' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        member.status === 'graduado' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-slate-800 text-slate-500 border-slate-700'
                                        }`}>{member.status}</span>
                                    {member.birthDate && <span>🎂 {format(new Date(member.birthDate), 'dd/MM/yyyy')}</span>}
                                    {member.email && <span className="flex items-center gap-1 text-slate-500"><Mail className="w-3 h-3" /> {member.email}</span>}
                                    {member.phoneNumber && <span className="flex items-center gap-1 text-slate-500"><Phone className="w-3 h-3" /> {member.phoneNumber}</span>}
                                </div>
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(member)} className="p-2 hover:bg-slate-800 rounded-lg text-blue-400"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(member.id)} className="p-2 hover:bg-slate-800 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal Overlay */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Editar' : 'Nuevo'} Miembro</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Nombre Completo</label>
                                <input
                                    required
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Email (Opcional)</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="ejemplo@gmail.com"
                                />
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Teléfono (Opcional)</label>
                                <input
                                    type="tel"
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white"
                                    value={formData.phoneNumber}
                                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="+58 412..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Tipo</label>
                                    <select
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white"
                                        value={formData.type}
                                        onChange={e => handleTypeChange(e.target.value)}
                                    >
                                        <option value="varon-hogar">Varón Hogar</option>
                                        <option value="varona-hogar">Varona Hogar</option>
                                        <option value="lider">Líder</option>
                                        <option value="pastor">Pastor</option>
                                        <option value="congregante">Congregante</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Status</label>
                                    <select
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        {getAllowedStatuses(formData.type).map(status => (
                                            <option key={status} value={status}>{status.replace('-', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Fecha de Nacimiento *</label>
                                <input
                                    type="date"
                                    required
                                    lang="es"
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-slate-300"
                                    value={formData.birthDate}
                                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-400 hover:bg-slate-800 rounded-xl">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Account Sync Modal */}
            {showSyncModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Link2 className="w-5 h-5 text-blue-500" />
                                Account Sync - Duplicados Detectados
                            </h2>
                            <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-white">×</button>
                        </div>

                        {duplicateGroups.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-slate-400">No se encontraron duplicados</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {duplicateGroups.map((group, idx) => (
                                    <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                        <p className="text-xs text-slate-500 mb-3 uppercase font-bold">Grupo {idx + 1}</p>
                                        <div className="space-y-2">
                                            {group.map((member, mIdx) => (
                                                <div key={member.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-lg">
                                                    <div>
                                                        <p className="text-white font-bold">{member.fullName}</p>
                                                        <p className="text-xs text-slate-400">
                                                            {member.email && `📧 ${member.email}`}
                                                            {member.phoneNumber && ` 📱 ${member.phoneNumber}`}
                                                            {member.birthDate && ` 🎂 ${format(new Date(member.birthDate), 'dd/MM/yyyy')}`}
                                                        </p>
                                                    </div>
                                                    {mIdx > 0 && (
                                                        <button
                                                            onClick={() => mergeMember(group[0].id, member.id)}
                                                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded-lg"
                                                        >
                                                            Fusionar con primera
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
