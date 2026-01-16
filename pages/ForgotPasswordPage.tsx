
import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft, Scissors } from 'lucide-react';
import { supabase } from '../src/supabaseClient';
import { Link } from 'react-router-dom';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/#/settings', // Redirects to settings where they can change password
            });

            if (error) throw error;

            setStatus('success');
            setMessage('Se este e-mail estiver cadastrado, você receberá um link de recuperação em instantes.');
        } catch (error: any) {
            setStatus('error');
            setMessage(error.message || 'Erro ao solicitar recuperação.');
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
                <div className="p-8 text-center border-b border-gray-800 bg-gray-900/50">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-800 mb-4">
                        <Scissors className="text-gray-400" size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-white">Recuperar Senha</h1>
                    <p className="text-gray-400 text-sm mt-2">Digite seu e-mail para receber o link de redefinição.</p>
                </div>

                <div className="p-8">
                    {status === 'success' ? (
                        <div className="text-center animate-in zoom-in">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="text-green-500" size={32} />
                            </div>
                            <h3 className="text-white font-bold mb-2">E-mail Enviado!</h3>
                            <p className="text-gray-400 text-sm mb-6">{message}</p>
                            <Link to="/login" className="text-primary-500 font-bold hover:underline flex items-center justify-center gap-2">
                                <ArrowLeft size={16} /> Voltar para Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {status === 'error' && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-500 text-sm text-center">
                                    {message}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">E-mail Cadastrado</label>
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

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold py-3.5 rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {status === 'loading' ? 'Enviando...' : (
                                    <>
                                        Enviar Link <ArrowRight size={20} />
                                    </>
                                )}
                            </button>

                            <div className="text-center">
                                <Link to="/login" className="text-gray-500 text-sm hover:text-white transition-colors">
                                    Voltar para Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
