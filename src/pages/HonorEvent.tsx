import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { IKContext, IKUpload } from 'imagekitio-react';
import {
    Calendar, DollarSign, CreditCard, Copy, Check,
    Upload, Image as ImageIcon, Share2, ArrowLeft, Heart
} from 'lucide-react';
import { toast } from 'react-toastify';

interface HonorPlan {
    id: string;
    title: string;
    targetDate: string;
    publicMessage: string;
    financialTarget?: number;
    contributionLink?: string;
    pagoMovil?: {
        phone: string;
        cedula: string;
        bank: string;
    };
    qrUrl?: string;
    photos?: string[]; // Array of photo URLs
}

export default function HonorEvent() {
    const { id } = useParams();
    const [plan, setPlan] = useState<HonorPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const unsub = onSnapshot(doc(db, 'honor_plans', id), (doc) => {
            if (doc.exists()) {
                setPlan({ id: doc.id, ...doc.data() } as HonorPlan);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [id]);

    const onUploadError = (err: any) => {
        console.error('Upload Error:', err);
        setUploading(false);
        toast.error('Error al subir la foto');
    };

    const onUploadSuccess = async (res: any) => {
        if (!id) return;
        try {
            await updateDoc(doc(db, 'honor_plans', id), {
                photos: arrayUnion(res.url)
            });
            toast.success('¡Foto subida con éxito!');
        } catch (error) {
            console.error(error);
            toast.error('Error al registrar la foto');
        } finally {
            setUploading(false);
        }
    };

    const onUploadStart = () => {
        setUploading(true);
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
        toast.success('Copiado al portapapeles');
    };

    const shareEvent = () => {
        if (navigator.share) {
            navigator.share({
                title: plan?.title,
                text: `¡Únete a la honra! ${plan?.title}`,
                url: window.location.href
            }).catch(console.error);
        } else {
            copyToClipboard(window.location.href, 'url');
        }
    };

    if (loading) return <div className="text-white text-center mt-10">Cargando evento...</div>;
    if (!plan) return <div className="text-white text-center mt-10">Evento no encontrado</div>;

    const ikPublicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
    const ikUrlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;
    const ikAuthEndpoint = `${window.location.origin}/api/imagekit-auth`;

    return (
        <IKContext
            publicKey={ikPublicKey}
            urlEndpoint={ikUrlEndpoint}
            authenticationEndpoint={ikAuthEndpoint}
        >
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white truncate">{plan.title}</h1>
                </div>

                {/* Main Info Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500/20 to-purple-500/20 p-6 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Heart className="w-8 h-8 text-slate-900 fill-current" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">{plan.title}</h2>
                            <p className="text-amber-400 font-medium flex items-center justify-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {plan.targetDate ? format(parseISO(plan.targetDate), 'EEEE d MMMM, yyyy', { locale: es }) : 'Fecha por confirmar'}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <p className="text-slate-300 leading-relaxed text-center whitespace-pre-line">
                            {plan.publicMessage}
                        </p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={shareEvent}
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-colors"
                            >
                                <Share2 className="w-4 h-4" />
                                Compartir
                            </button>
                        </div>
                    </div>
                </div>

                {/* Payment / Contribution Section */}
                {(plan.pagoMovil || plan.contributionLink) && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            Sembrar Honra
                        </h3>

                        {plan.financialTarget && plan.financialTarget > 0 && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4 flex items-center justify-between">
                                <span className="text-green-400 font-medium">Contribución:</span>
                                <span className="text-2xl font-bold text-white">${plan.financialTarget}</span>
                            </div>
                        )}

                        {plan.contributionLink && (
                            <a
                                href={plan.contributionLink}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-full bg-green-600 hover:bg-green-500 text-white text-center font-bold py-3 rounded-xl transition-colors mb-4"
                            >
                                Link de Aporte (Paypal/Stripe)
                            </a>
                        )}

                        {plan.pagoMovil && (
                            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-sm">
                                <h4 className="text-slate-400 font-bold mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" /> Pago Móvil
                                </h4>
                                <div className="space-y-3">
                                    {plan.pagoMovil.bank && (
                                        <div className="flex justify-between items-center group">
                                            <span className="text-slate-500">Banco:</span>
                                            <button onClick={() => copyToClipboard(plan.pagoMovil!.bank, 'bank')} className="text-white hover:text-green-400 font-mono flex items-center gap-2">
                                                {plan.pagoMovil.bank}
                                                {copiedField === 'bank' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 group-hover:opacity-100 opacity-0 transition-opacity" />}
                                            </button>
                                        </div>
                                    )}
                                    {plan.pagoMovil.phone && (
                                        <div className="flex justify-between items-center group">
                                            <span className="text-slate-500">Teléfono:</span>
                                            <button onClick={() => copyToClipboard(plan.pagoMovil!.phone, 'phone')} className="text-white hover:text-green-400 font-mono flex items-center gap-2">
                                                {plan.pagoMovil.phone}
                                                {copiedField === 'phone' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 group-hover:opacity-100 opacity-0 transition-opacity" />}
                                            </button>
                                        </div>
                                    )}
                                    {plan.pagoMovil.cedula && (
                                        <div className="flex justify-between items-center group">
                                            <span className="text-slate-500">Cédula:</span>
                                            <button onClick={() => copyToClipboard(plan.pagoMovil!.cedula, 'cedula')} className="text-white hover:text-green-400 font-mono flex items-center gap-2">
                                                {plan.pagoMovil.cedula}
                                                {copiedField === 'cedula' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 group-hover:opacity-100 opacity-0 transition-opacity" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {plan.qrUrl && (
                            <div className="flex justify-center pt-2">
                                <img src={plan.qrUrl} alt="QR Pago" className="w-48 h-48 rounded-lg border-4 border-white object-cover" />
                            </div>
                        )}
                    </div>
                )}

                {/* Photo Gallery & Upload */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-purple-500" />
                            Galería del Evento
                        </h3>

                        <label className={`cursor-pointer bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {uploading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Upload className="w-4 h-4" />}
                            {uploading ? 'Subiendo...' : 'Subir Foto'}
                            <IKUpload
                                fileName={`honor_${id}_${Date.now()}`}
                                folder={`/honor_events/${id}`}
                                onError={onUploadError}
                                onSuccess={onUploadSuccess}
                                onUploadStart={onUploadStart}
                                className="hidden"
                                useUniqueFileName={true}
                            />
                        </label>
                    </div>

                    {plan.photos && plan.photos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {plan.photos.map((photo, idx) => (
                                <a key={idx} href={photo} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-slate-700 hover:opacity-90 transition-opacity relative group">
                                    <img src={photo} alt={`Evento ${idx}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Share2 className="w-6 h-6 text-white" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                <ImageIcon className="w-6 h-6 text-slate-500" />
                            </div>
                            <p className="text-slate-400 text-sm">Aún no hay fotos.</p>
                            <p className="text-slate-500 text-xs">¡Sé el primero en compartir un momento!</p>
                        </div>
                    )}
                </div>
            </div>
        </IKContext>
    );
}
