
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertTriangle, Eye, EyeOff, ShieldCheck, Scissors } from 'lucide-react';
import { useAuth } from '../AuthContext';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simula um pequeno delay de rede para UX
        // setTimeout(async () => {
        try {
            const success = await login(email, password);
            if (!success) {
                setError('Credenciais inválidas. Verifique seu e-mail e senha.');
                setIsLoading(false);
            }
            // on success, redirect happens via AuthContext/App.tsx
        } catch (err) {
            console.error('LoginPage Submit Error:', err);
            setError('Erro ao tentar conectar. Tente novamente.');
            setIsLoading(false);
        }
        // }, 800);
    };

    // Preenchimento rápido para demonstração
    const fillCredentials = (type: 'admin' | 'barber' | 'receptionist') => {
        if (type === 'admin') {
            setEmail('admin@barbermaster.com.br');
            setPassword('admin123');
        } else if (type === 'barber') {
            setEmail('carlos@barbermaster.com.br');
            setPassword('securepassword');
        } else if (type === 'receptionist') {
            setEmail('ana@barbermaster.com.br');
            setPassword('securepassword');
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary-500/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md bg-dark-900 border border-gray-800 rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-500">

                {/* Header */}
                <div className="p-8 text-center border-b border-gray-800 bg-gray-900/50">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/20 mb-6">
                        <Scissors className="text-dark-950" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">BARBER<span className="text-primary-500">MASTER</span></h1>
                    <p className="text-gray-400 text-sm mt-2">Sistema de Gestão Profissional</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-red-500 text-sm animate-in slide-in-from-top-2">
                                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">E-mail de Acesso</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 text-gray-500 group-focus-within:text-primary-500 transition-colors" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Senha</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-primary-500 transition-colors" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-gray-300">
                                <input type="checkbox" className="rounded border-gray-700 bg-gray-800 text-primary-500 focus:ring-primary-500/50" />
                                Lembrar-me
                            </label>
                            <Link to="/forgot-password" className="text-primary-500 hover:text-primary-400 font-medium hover:underline">Esqueceu a senha?</Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold py-3.5 rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-dark-950 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Entrar no Sistema <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400 text-sm">
                            Não tem cadastro?{' '}
                            {/* @ts-ignore - Link is from react-router-dom which is available */}
                            <Link to="/signup" className="text-primary-500 hover:underline font-bold">
                                Criar Conta
                            </Link>
                        </p>
                    </div>

                    {/* DEMO HELPERS */}
                    <div className="mt-8 pt-6 border-t border-gray-800">
                        <p className="text-center text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-widest">Acesso Rápido (Demo)</p>
                        <div className="flex justify-center gap-2">
                            <button
                                onClick={() => fillCredentials('admin')}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
                                title="admin@barbermaster.com.br / admin"
                            >
                                Admin
                            </button>
                            <button
                                onClick={() => fillCredentials('barber')}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
                                title="carlos@barbermaster.com.br / securepassword"
                            >
                                Barbeiro
                            </button>
                            <button
                                onClick={() => fillCredentials('receptionist')}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
                                title="ana@barbermaster.com.br / securepassword"
                            >
                                Recepção
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-900/80 p-4 text-center border-t border-gray-800">
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                        <ShieldCheck size={12} /> Ambiente Seguro e Criptografado
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
