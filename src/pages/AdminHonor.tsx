import { useState, useEffect } from 'react';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, Trash2, Calendar, Send, CreditCard } from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Member {
    id: string;
    fullName: string;
    type: string;
}

interface HonorPlan {
    id: string;
    title: string;
    targetDate: string;
    honoreeIds: string[];
    description: string;
    publicMessage: string;
    financialTarget?: number;
    contributionLink?: string; // Optional legacy link
    pagoMovil?: {
        phone: string;
        cedula: string;
        bank: string;
    };
    qrUrl?: string; // URL of the uploaded QR code
    status: 'planning' | 'active' | 'completed';
    createdAt: any;
}

export default function HonorAdmin() {
    const [plans, setPlans] = useState<HonorPlan[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        targetDate: '',
        honoreeIds: [] as string[],
        description: '',
        publicMessage: '',
        financialTarget: '',
        // Pago Movil Fields
        pmPhone: '',
        pmCedula: '',
        pmBank: '',
    });
    const [qrFile, setQrFile] = useState<File | null>(null);

    useEffect(() => {
        const qPlans = query(collection(db, 'honor_plans'), orderBy('targetDate', 'desc'));
        const unsubPlans = onSnapshot(qPlans, (snap) => {
            setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as HonorPlan)));
        });

        const qMembers = query(collection(db, 'members'), orderBy('fullName'));
        const unsubMembers = onSnapshot(qMembers, (snap) => {
            setMembers(snap.docs.map(d => ({ id: d.id, fullName: d.data().fullName, type: d.data().type } as Member)));
        });

        return () => { unsubPlans(); unsubMembers(); };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setQrFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            let qrUrl = '';

            if (qrFile) {
                const storageRef = ref(storage, `honor_qrs/${Date.now()}_${qrFile.name}`);
                const snapshot = await uploadBytes(storageRef, qrFile);
                qrUrl = await getDownloadURL(snapshot.ref);
            }

            const pagoMovilData = (formData.pmPhone || formData.pmCedula || formData.pmBank) ? {
                phone: formData.pmPhone,
                cedula: formData.pmCedula,
                bank: formData.pmBank
            } : undefined;

            await addDoc(collection(db, 'honor_plans'), {
                title: formData.title,
                targetDate: formData.targetDate,
                honoreeIds: formData.honoreeIds,
                description: formData.description,
                publicMessage: formData.publicMessage,
                financialTarget: Number(formData.financialTarget) || 0,
                pagoMovil: pagoMovilData,
                qrUrl: qrUrl,
                status: 'active',
                createdAt: new Date()
            });

            // Trigger Push Notification (Fire and Forget)
            fetch('/api/send-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: '👑 Nueva Oportunidad de Honra',
                    body: `Se ha creado el plan: ${formData.title}. ¡Entra para ver los detalles!`,
                })
            }).catch(err => console.error('Error triggering push:', err));

            toast.success('Plan creado exitosamente');
            setShowModal(false);
            setFormData({
                title: '', targetDate: '', honoreeIds: [], description: '',
                publicMessage: '', financialTarget: '', pmPhone: '', pmCedula: '', pmBank: ''
            });
            setQrFile(null);
        } catch (error) {
            console.error(error);
            toast.error('Error al crear plan');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este plan?')) {
            await deleteDoc(doc(db, 'honor_plans', id));
        }
    };

    const toggleHonoree = (id: string) => {
        setFormData(prev => ({
            ...prev,
            honoreeIds: prev.honoreeIds.includes(id)
                ? prev.honoreeIds.filter(h => h !== id)
                : [...prev.honoreeIds, id]
        }));
    };

    const generateWhatsAppLink = (plan: HonorPlan) => {
        const honoreeNames = members
            .filter(m => plan.honoreeIds.includes(m.id))
            .map(m => m.fullName)
            .join(', ');

        const dateStr = plan.targetDate ? format(new Date(plan.targetDate), 'dd MMMM', { locale: es }) : 'Fecha por definir';

        let message = `*HONRA ESPECIAL: ${plan.title}* 👑\n\n` +
            `Familia, estaremos honrando a: *${honoreeNames}* el día ${dateStr}.\n\n` +
            `${plan.publicMessage}\n\n`;

        if (plan.pagoMovil || plan.qrUrl) {
            message += `*DATOS PARA APORTAR:*\n`;
            if (plan.pagoMovil) {
                if (plan.pagoMovil.bank) message += `🏦 ${plan.pagoMovil.bank}\n`;
                if (plan.pagoMovil.phone) message += `📱 ${plan.pagoMovil.phone}\n`;
                if (plan.pagoMovil.cedula) message += `🆔 ${plan.pagoMovil.cedula}\n`;
            }
            if (plan.qrUrl) {
                message += `(Ver QR en la App)\n`;
            }
        }

        message += `\n¡No faltes!`;

        return `https://wa.me/?text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-amber-500" />
                    Planes de Honra
                </h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-4 rounded-xl flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Plan
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-white">{plan.title}</h3>
                                <p className="text-slate-400 text-sm flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {plan.targetDate && format(new Date(plan.targetDate), 'dd MMM yyyy', { locale: es })}
                                </p>
                            </div>
                            <button onClick={() => handleDelete(plan.id)} className="text-slate-600 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-500 uppercase">Honrando a:</p>
                            <div className="flex flex-wrap gap-2">
                                {members.filter(m => plan.honoreeIds.includes(m.id)).map(m => (
                                    <span key={m.id} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30">
                                        {m.fullName}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex gap-2">
                            <a
                                href={generateWhatsAppLink(plan)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold"
                            >
                                <Send className="w-4 h-4" />
                                WhatsApp Template
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-4">Nuevo Plan de Honra</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Título del Evento</label>
                                    <input required className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white"
                                        value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Ej: Honra Pastores Marzo" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Fecha del Evento</label>
                                    <input type="date" required className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white"
                                        value={formData.targetDate} onChange={e => setFormData({ ...formData, targetDate: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-2">¿A quién honraremos?</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto bg-slate-800 p-2 rounded-lg border border-slate-700">
                                    {members.map(m => (
                                        <label key={m.id} className="flex items-center gap-2 p-1 hover:bg-slate-700 rounded cursor-pointer">
                                            <input type="checkbox"
                                                checked={formData.honoreeIds.includes(m.id)}
                                                onChange={() => toggleHonoree(m.id)}
                                                className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500" />
                                            <span className="text-sm text-slate-300 truncate">{m.fullName}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Mensaje Público (para WhatsApp)</label>
                                <textarea required className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white h-24"
                                    value={formData.publicMessage} onChange={e => setFormData({ ...formData, publicMessage: e.target.value })}
                                    placeholder="Mensaje de invitación y ánimo para la congregación..." />
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Meta de Ofrenda ($)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                                    <input type="number" min="0" className="w-full bg-slate-800 border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white"
                                        value={formData.financialTarget} onChange={e => setFormData({ ...formData, financialTarget: e.target.value })}
                                        placeholder="0.00" />
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                                <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    Datos de Pago Móvil
                                </h3>
                                <div className="grid md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Banco</label>
                                        <select className="w-full bg-slate-800 border-slate-700 rounded-lg px-3 py-2 text-white text-sm appearance-none"
                                            value={formData.pmBank} onChange={e => setFormData({ ...formData, pmBank: e.target.value })}>
                                            <option value="">Seleccione Banco</option>
                                            <option value="0102 - Banco de Venezuela">0102 - Banco de Venezuela</option>
                                            <option value="0105 - Mercantil">0105 - Mercantil</option>
                                            <option value="0108 - Provincial">0108 - Provincial</option>
                                            <option value="0134 - Banesco">0134 - Banesco</option>
                                            <option value="0114 - Bancaribe">0114 - Bancaribe</option>
                                            <option value="0115 - Exterior">0115 - Exterior</option>
                                            <option value="0137 - Sofitasa">0137 - Sofitasa</option>
                                            <option value="0151 - BFC">0151 - BFC</option>
                                            <option value="0156 - 100% Banco">0156 - 100% Banco</option>
                                            <option value="0157 - Del Sur">0157 - Del Sur</option>
                                            <option value="0163 - Tesoro">0163 - Tesoro</option>
                                            <option value="0166 - Agricola">0166 - Agricola</option>
                                            <option value="0168 - Bancrecer">0168 - Bancrecer</option>
                                            <option value="0169 - Mi Banco">0169 - Mi Banco</option>
                                            <option value="0171 - Activo">0171 - Activo</option>
                                            <option value="0172 - Bancamiga">0172 - Bancamiga</option>
                                            <option value="0174 - Banplus">0174 - Banplus</option>
                                            <option value="0175 - Bicentenario">0175 - Bicentenario</option>
                                            <option value="0177 - Banfanb">0177 - Banfanb</option>
                                            <option value="0191 - BNC">0191 - BNC</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Teléfono</label>
                                        <input className="w-full bg-slate-800 border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                            value={formData.pmPhone} onChange={e => setFormData({ ...formData, pmPhone: e.target.value })}
                                            placeholder="Ej: 0414..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Cédula / RIF</label>
                                        <input className="w-full bg-slate-800 border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                            value={formData.pmCedula} onChange={e => setFormData({ ...formData, pmCedula: e.target.value })}
                                            placeholder="V-123456" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Subir QR (Opcional)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="block w-full text-sm text-slate-500
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-amber-500 file:text-slate-900
                                                hover:file:bg-amber-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-400 hover:bg-slate-800 rounded-xl">Cancelar</button>
                                <button type="submit" disabled={uploading} className="flex-1 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50">
                                    {uploading ? 'Guardando...' : 'Crear Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
