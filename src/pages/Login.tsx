import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Sparkles } from 'lucide-react'; // Simulating icons

export default function Login() {
    const { signInWithGoogle, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
                        <Sparkles className="w-10 h-10 text-amber-500" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">Alcance Victoria</h1>
                <p className="text-slate-400 mb-8 uppercase tracking-wider text-sm font-medium">Ministerio de Honra</p>

                <button
                    onClick={signInWithGoogle}
                    className="w-full bg-white hover:bg-gray-100 text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                    Iniciar Sesión con Google
                </button>

                <p className="text-slate-500 text-xs mt-6">
                    Solo personal autorizado por el liderazgo.
                </p>
            </div>
        </div>
    );
}
