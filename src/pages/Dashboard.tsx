import { useAuth } from '../contexts/AuthContext';
import {
    Users,
    Calendar as CalendarIcon,
    Cake,
    Trophy
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { differenceInDays, addYears, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Member {
    id: string;
    fullName: string;
    type: string;
    birthDate: string;
    daysUntil?: number;
    nextBirthday?: Date;
}

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        total: 0,
        birthdaysMonth: 0,
        upcomingEvents: 0
    });
    const [upcomingBirthdays, setUpcomingBirthdays] = useState<Member[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const q = query(collection(db, 'members'));
            const snapshot = await getDocs(q);
            const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Member[];

            const today = new Date();
            const currentMonth = today.getMonth();
            const upcoming: Member[] = [];
            let monthCount = 0;

            members.forEach(member => {
                if (!member.birthDate) return;

                // Parse "YYYY-MM-DD"
                // We only care about MM-DD for birthday calculation
                const [, m, d] = member.birthDate.split('-').map(Number);

                // Note: Months are 0-indexed in JS Date
                const birthdayThisYear = new Date(today.getFullYear(), m - 1, d);

                let nextBirthday = birthdayThisYear;
                // If birthday has passed this year, look at next year
                if (differenceInDays(birthdayThisYear, today) < 0) {
                    nextBirthday = addYears(birthdayThisYear, 1);
                }

                const daysUntil = differenceInDays(nextBirthday, today);

                // Stats: Birthdays in current month
                if (m - 1 === currentMonth) monthCount++;

                // Upcoming in next 30 days
                if (daysUntil >= 0 && daysUntil <= 30) {
                    upcoming.push({ ...member, daysUntil, nextBirthday });
                }
            });

            // Sort by soonest
            upcoming.sort((a, b) => (a.daysUntil || 0) - (b.daysUntil || 0));

            setStats({
                total: members.length,
                birthdaysMonth: monthCount,
                upcomingEvents: 0 // Placeholder
            });
            setUpcomingBirthdays(upcoming.slice(0, 5));
        };

        fetchData();
    }, []);

    const statCards = [
        { title: 'Total Miembros', value: stats.total, icon: Users, color: 'bg-blue-500' },
        { title: 'Cumpleaños Este Mes', value: stats.birthdaysMonth, icon: Cake, color: 'bg-amber-500' },
        { title: 'Aniversarios Hogar', value: '0', icon: Trophy, color: 'bg-indigo-500' },
        { title: 'Eventos Próximos', value: '0', icon: CalendarIcon, color: 'bg-green-500' },
    ];

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-white">Hola, {user?.displayName?.split(' ')[0]} 👋</h1>
                <p className="text-slate-400">Bienvenido al Panel de Honra</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                        <div className={`${stat.color} p-3 rounded-lg text-white`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-medium uppercase">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Upcoming Birthdays Section */}
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Cake className="w-5 h-5 text-amber-500" />
                    Próximos Cumpleaños (30 días)
                </h2>
                {upcomingBirthdays.length === 0 ? (
                    <p className="text-slate-500 text-sm">No hay cumpleaños cercanos.</p>
                ) : (
                    <div className="space-y-3">
                        {upcomingBirthdays.map((member) => (
                            <div key={member.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${member.type === 'pastor' ? 'bg-purple-500/20 text-purple-400' :
                                        member.type === 'lider' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-slate-800 text-slate-300'
                                        }`}>
                                        {member.fullName[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{member.fullName}</p>
                                        <p className="text-xs text-slate-500 capitalize">{member.type}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-amber-500 font-bold text-sm">
                                        {member.nextBirthday && format(member.nextBirthday, 'd MMM', { locale: es })}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {member.daysUntil === 0 ? '¡Es Hoy!' : `En ${member.daysUntil} días`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
