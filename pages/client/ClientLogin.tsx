import React, { useState } from 'react';
import { Mail, Lock, User, Phone, Calendar, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import clientService from '../../src/services/clientService';

interface ClientLoginProps {
    tenant: any;
    onLogin: (clientData: any) => void;
}

const ClientLogin: React.FC<ClientLoginProps> = ({ tenant, onLogin }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [loginData, setLoginData] = useState({
        phone: '',
        password: ''
    });

    const [registerData, setRegisterData] = useState({
        name: '',
        phone: '',
        email: '',
        birthDate: '',
        password: '',
        confirmPassword: ''
    });

    const appConfig = tenant?.settings?.app_config?.general;
    const primaryColor = appConfig?.primaryColor || '#eab308';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login attempt:', loginData);
        setLoading(true);

        try {
            // Buscar cliente no Supabase
            const client = await clientService.login(tenant.id, loginData.phone);

            if (!client) {
                alert('Cliente não encontrado! Cadastre-se primeiro.');
                setLoading(false);
                return;
            }

            // Salvar sessão
            const sessionData = {
                clientId: client.id,
                phone: client.phone,
                name: client.name,
                tenantId: tenant.id
            };

            localStorage.setItem(`client_session_${tenant.slug}`, JSON.stringify(sessionData));
            console.log('Login successful!', sessionData);
            onLogin(sessionData);
        } catch (error) {
            console.error('Login error:', error);
            alert('Erro ao fazer login. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Register attempt:', registerData);
        setLoading(true);

        try {
            if (registerData.password !== registerData.confirmPassword) {
                alert('As senhas não coincidem!');
                setLoading(false);
                return;
            }

            if (!registerData.name || !registerData.phone || !registerData.password) {
                alert('Preencha todos os campos obrigatórios!');
                setLoading(false);
                return;
            }

            // Registrar no Supabase
            const client = await clientService.register(tenant.id, {
                name: registerData.name,
                phone: registerData.phone,
                email: registerData.email,
                birthDate: registerData.birthDate,
                password: registerData.password
            });

            // Salvar sessão
            const sessionData = {
                clientId: client.id,
                phone: client.phone,
                name: client.name,
                tenantId: tenant.id
            };

            localStorage.setItem(`client_session_${tenant.slug}`, JSON.stringify(sessionData));
            console.log('Registration successful!', sessionData);
            onLogin(sessionData);
        } catch (error: any) {
            console.error('Registration error:', error);
            if (error.code === '23505') {
                alert('Este telefone já está cadastrado! Faça login.');
            } else {
                alert('Erro ao criar conta. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6"
            style={{
                background: `linear-gradient(135deg, ${primaryColor}15 0%, #0f172a 100%)`
            }}
        >
            {/* Logo */}
            <div className="mb-8 text-center">
                {appConfig?.logoPreview && (
                    <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden bg-white shadow-xl">
                        <img
                            src={appConfig.logoPreview}
                            alt={appConfig.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
                {/* DEBUG: Mostrar URL da imagem se estiver quebrada */}
                <p className="text-xs text-red-500 break-all hidden">{appConfig?.logoPreview}</p>
                <h1 className="text-2xl font-bold text-white">{appConfig?.name || 'BarberMaster'}</h1>
                <p className="text-gray-400 text-sm mt-1">{appConfig?.slogan || 'Agende seu corte'}</p>
            </div>

            {/* Card de Login/Registro */}
            <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 py-4 font-medium transition-colors ${mode === 'login'
                            ? 'border-b-2 text-white'
                            : 'text-gray-400'
                            }`}
                        style={{ borderColor: mode === 'login' ? primaryColor : 'transparent' }}
                    >
                        <LogIn className="inline-block mr-2" size={18} />
                        Entrar
                    </button>
                    <button
                        onClick={() => setMode('register')}
                        className={`flex-1 py-4 font-medium transition-colors ${mode === 'register'
                            ? 'border-b-2 text-white'
                            : 'text-gray-400'
                            }`}
                        style={{ borderColor: mode === 'register' ? primaryColor : 'transparent' }}
                    >
                        <UserPlus className="inline-block mr-2" size={18} />
                        Cadastrar
                    </button>
                </div>

                <div className="p-6">
                    {mode === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="tel"
                                        value={loginData.phone}
                                        onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                                        placeholder="(11) 99999-9999"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={loginData.password}
                                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-12 py-3 text-white focus:outline-none focus:border-primary-500"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-lg font-bold text-dark-950 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {loading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={registerData.name}
                                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                        placeholder="Seu nome"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="tel"
                                        value={registerData.phone}
                                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                                        placeholder="(11) 99999-9999"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">E-mail (opcional)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        value={registerData.email}
                                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                        placeholder="seu@email.com"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Data de Nascimento</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="date"
                                        value={registerData.birthDate}
                                        onChange={(e) => setRegisterData({ ...registerData, birthDate: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={registerData.password}
                                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-12 py-3 text-white focus:outline-none focus:border-primary-500"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        value={registerData.confirmPassword}
                                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-lg font-bold text-dark-950 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {loading ? 'Criando conta...' : 'Criar Conta'}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Footer */}
            <p className="text-gray-500 text-xs mt-6 text-center">
                Ao continuar, você concorda com nossos termos de serviço
            </p>
        </div>
    );
};

export default ClientLogin;
