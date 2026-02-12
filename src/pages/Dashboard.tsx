import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { format, parseISO, getYear, setYear, getMonth, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Gift, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Birthday {
    id: string;
    fullName: string;
    birthDate: string;
    photoURL?: string;
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
    contributionLink?: string;
    qrUrl?: string;
    status: 'planning' | 'active' | 'completed';
}

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [birthdays, setBirthdays] = useState<Birthday[]>([]);
    const [honorPlans, setHonorPlans] = useState<HonorPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            // 1. Get Current User's Member ID (to exclude them from their own surprise)
            let currentMemberId = '';
            if (user.email) {
                const qMember = query(collection(db, 'members'), where('email', '==', user.email));
                const memberSnap = await getDocs(qMember);
                if (!memberSnap.empty) {
                    currentMemberId = memberSnap.docs[0].id;
                }
            }

            // 2. Fetch Honor Plans (filter in memory to avoid missing index errors)
            const qPlans = query(
                collection(db, 'honor_plans'),
                orderBy('targetDate', 'asc')
            );
            const plansSnap = await getDocs(qPlans);
            const allPlans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() } as HonorPlan));

            // FILTER: Show active/planning, hide if user is honoree, and validate targetDate
            const visiblePlans = allPlans.filter(plan => {
                if (plan.status !== 'active' && plan.status !== 'planning') return false;
                if (plan.honoreeIds.includes(currentMemberId)) return false;
                if (!plan.targetDate) return false;
                
                const date = new Date(plan.targetDate);
                const year = date.getFullYear();
                return !isNaN(date.getTime()) && year >= 1900 && year <= 2100;
            });
            setHonorPlans(visiblePlans);

            // 3. Fetch Birthdays - Show all birthdays in current month
            const qMembers = query(collection(db, 'members'));
            const membersSnap = await getDocs(qMembers);

            const today = new Date();
            const currentMonth = getMonth(today);

            const upcoming = membersSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Birthday))
                .filter(m => {
                    if (!m.birthDate) return false;
                    const birth = parseISO(m.birthDate);
                    return getMonth(birth) === currentMonth;
                })
                .sort((a, b) => {
                    const dayA = parseISO(a.birthDate).getDate();
                    const dayB = parseISO(b.birthDate).getDate();
                    return dayA - dayB;
                });

            setBirthdays(upcoming);
            setLoading(false);
        };

        fetchData();
    }, [user]);

    const getDaysAway = (dateStr: string) => {
        const today = new Date();
        const birth = parseISO(dateStr);
        const day = birth.getDate();
        const todayDay = today.getDate();
        
        if (day === todayDay) return '¡Es Hoy!';
        if (day < todayDay) return 'Ya pasó';
        return `En ${day - todayDay} días`;
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-white">Hola, {user?.displayName?.split(' ')[0]} 👋</h1>

            {/* HONOR PLANS SECTION */}
            {honorPlans.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold text-amber-500 mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5" />
                        Oportunidades de Honra
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        {honorPlans.map(plan => (
                            <div
                                key={plan.id}
                                onClick={() => navigate(`/honor/${plan.id}`)}
                                className="bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/30 p-6 rounded-2xl relative overflow-hidden cursor-pointer hover:border-amber-500/60 transition-colors group"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Gift className="w-24 h-24 text-amber-500" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">{plan.title}</h3>
                                    {plan.targetDate && (
                                        <p className="text-sky-300 font-medium mb-4 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            {format(parseISO(plan.targetDate), 'dd MMMM', { locale: es })}
                                        </p>
                                    )}
                                    <p className="text-slate-300 mb-6 text-sm leading-relaxed whitespace-pre-line line-clamp-3">
                                        {plan.publicMessage}
                                    </p>

                                    <div className="inline-flex items-center gap-2 text-amber-500 font-bold text-sm">
                                        Ver detalles y Sembrar
                                        <Heart className="w-4 h-4 fill-current" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* BIRTHDAYS SECTION */}
            {/* Same as before... */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-purple-400" />
                    Cumpleaños Próximos
                </h2>
                {loading ? (
                    <p className="text-slate-500">Cargando fechas...</p>
                ) : birthdays.length === 0 ? (
                    <p className="text-slate-500">No hay cumpleaños cercanos.</p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {birthdays.map(member => (
                            <div key={member.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${member.type === 'pastor' ? 'bg-purple-500/20 text-purple-400' :
                                    member.type === 'lider' ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-slate-800 text-slate-300'
                                    }`}>
                                    {member.fullName[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{member.fullName}</h3>
                                    <p className="text-sm text-purple-400 font-medium">{getDaysAway(member.birthDate)}</p>
                                    {member.birthDate && (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {format(parseISO(member.birthDate), 'dd MMMM', { locale: es })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
