import React, { useState } from 'react';
import { Mail, Lock, User, Phone, Calendar, Eye, EyeOff, LogIn, UserPlus, Smartphone } from 'lucide-react';
import clientService from '../../src/services/clientService';

interface ClientLoginProps {
    tenant: any;
    onLogin: (clientData: any) => void;
}

const ClientLogin: React.FC<ClientLoginProps> = ({ tenant, onLogin }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'otp'>('otp');
    const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [loginData, setLoginData] = useState({
        phone: '',
        password: ''
    });

    const [otpData, setOtpData] = useState({
        phone: '',
        code: ''
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

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await clientService.requestOTP(otpData.phone);
            setOtpStep('code');
        } catch (error) {
            console.error('OTP request error:', error);
            alert('Erro ao enviar código. Verifique o número.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await clientService.verifyOTP(tenant.id, otpData.phone, otpData.code);

            if (result.isNew) {
                // Cliente novo que validou o telefone, levar para o registro pré-preenchido
                alert('Telefone validado! Complete seu cadastro para continuar.');
                setMode('register');
                setRegisterData(prev => ({ ...prev, phone: result.phone }));
                return;
            }

            // Cliente existente
            const sessionData = {
                clientId: result.id,
                phone: result.phone,
                name: result.name,
                tenantId: tenant.id
            };

            localStorage.setItem(`client_session_${tenant.slug}`, JSON.stringify(sessionData));
            onLogin(sessionData);
        } catch (error: any) {
            console.error('OTP verification error:', error);
            if (error.message === 'invalid_code') {
                alert('Código inválido ou expirado.');
            } else {
                alert('Erro ao verificar código.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await clientService.login(tenant.id, loginData.phone, loginData.password);

            if (!result) {
                alert('Cliente não encontrado! Cadastre-se ou use o Acesso Rápido.');
                setLoading(false);
                return;
            }

            if (result.needsPassword) {
                alert('Sua conta foi migrada! Use o "Acesso por Código" para entrar rapidamente ou defina uma senha no cadastro.');
                setMode('otp');
                setOtpData({ ...otpData, phone: result.phone });
                setLoading(false);
                return;
            }

            const sessionData = {
                clientId: result.id,
                phone: result.phone,
                name: result.name,
                tenantId: tenant.id
            };

            localStorage.setItem(`client_session_${tenant.slug}`, JSON.stringify(sessionData));
            onLogin(sessionData);
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.message === 'invalid_password') {
                alert('Senha incorreta!');
            } else {
                alert('Erro ao fazer login.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (registerData.password !== registerData.confirmPassword) {
                alert('As senhas não coincidem!');
                setLoading(false);
                return;
            }

            const client = await clientService.register(tenant.id, {
                name: registerData.name,
                phone: registerData.phone,
                email: registerData.email,
                birthDate: registerData.birthDate,
                password: registerData.password
            });

            const sessionData = {
                clientId: client.id,
                phone: client.phone,
                name: client.name,
                tenantId: tenant.id
            };

            localStorage.setItem(`client_session_${tenant.slug}`, JSON.stringify(sessionData));
            onLogin(sessionData);
        } catch (error: any) {
            console.error('Registration error:', error);
            if (error.code === '23505') {
                alert('Este telefone já está cadastrado!');
            } else {
                alert('Erro ao criar conta.');
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
                <h1 className="text-2xl font-bold text-white">{appConfig?.name || 'BarberMaster'}</h1>
                <p className="text-gray-400 text-sm mt-1">{appConfig?.slogan || 'Agende seu corte'}</p>
            </div>

            {/* Card de Login/Registro/OTP */}
            <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => { setMode('otp'); setOtpStep('phone'); }}
                        className={`flex-1 py-4 font-medium transition-colors ${mode === 'otp' ? 'border-b-2 text-white' : 'text-gray-400'}`}
                        style={{ borderColor: mode === 'otp' ? primaryColor : 'transparent' }}
                    >
                        <Smartphone className="inline-block mr-2" size={18} />
                        Código
                    </button>
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 py-4 font-medium transition-colors ${mode === 'login' ? 'border-b-2 text-white' : 'text-gray-400'}`}
                        style={{ borderColor: mode === 'login' ? primaryColor : 'transparent' }}
                    >
                        <LogIn className="inline-block mr-2" size={18} />
                        Senha
                    </button>
                    <button
                        onClick={() => setMode('register')}
                        className={`flex-1 py-4 font-medium transition-colors ${mode === 'register' ? 'border-b-2 text-white' : 'text-gray-400'}`}
                        style={{ borderColor: mode === 'register' ? primaryColor : 'transparent' }}
                    >
                        <UserPlus className="inline-block mr-2" size={18} />
                        Cadastrar
                    </button>
                </div>

                <div className="p-6">
                    {mode === 'otp' ? (
                        <div className="space-y-4">
                            {otpStep === 'phone' ? (
                                <form onSubmit={handleSendOTP} className="space-y-4">
                                    <p className="text-sm text-gray-400 text-center mb-4">
                                        Digite seu celular para receber um código de acesso por mensagem.
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="tel"
                                                value={otpData.phone}
                                                onChange={(e) => setOtpData({ ...otpData, phone: e.target.value })}
                                                placeholder="(11) 99999-9999"
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 rounded-lg font-bold text-dark-950 transition-all hover:scale-105 disabled:opacity-50"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {loading ? 'Enviando...' : 'Receber Código'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOTP} className="space-y-4">
                                    <p className="text-sm text-gray-400 text-center mb-4">
                                        Enviamos um código de 6 dígitos para <strong>{otpData.phone}</strong>.
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Código de Segurança</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={otpData.code}
                                                onChange={(e) => setOtpData({ ...otpData, code: e.target.value })}
                                                placeholder="000 000"
                                                maxLength={6}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-center tracking-widest text-xl font-bold focus:outline-none focus:border-primary-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 rounded-lg font-bold text-dark-950 transition-all hover:scale-105 disabled:opacity-50"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {loading ? 'Verificando...' : 'Confirmar e Entrar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOtpStep('phone')}
                                        className="w-full text-sm text-gray-500 hover:text-white transition-colors"
                                    >
                                        Alterar telefone
                                    </button>
                                </form>
                            )}
                        </div>
                    ) : mode === 'login' ? (
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
                                className="w-full py-3 rounded-lg font-bold text-dark-950 transition-all hover:scale-105 disabled:opacity-50"
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

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-lg font-bold text-dark-950 transition-all hover:scale-105 disabled:opacity-50"
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
