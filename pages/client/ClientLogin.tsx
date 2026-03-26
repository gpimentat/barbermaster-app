import React, { useState, useEffect } from 'react';
import { Phone, User, ArrowRight, MessageCircle, Star, ShieldCheck } from 'lucide-react';
import clientService from '../../src/services/clientService';

interface ClientLoginProps {
    tenant: any;
    onLogin: (clientData: any) => void;
}

const ClientLogin: React.FC<ClientLoginProps> = ({ tenant, onLogin }) => {
    const [step, setStep] = useState<'phone' | 'name'>('phone');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [foundClient, setFoundClient] = useState<any>(null);

    const appConfig = tenant?.settings?.app_config?.general;
    const primaryColor = appConfig?.primaryColor || '#eab308';

    // Formatar Telefone automaticamente
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);

        if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        if (value.length > 9) value = `${value.slice(0, 9)}-${value.slice(9)}`;

        setPhone(value);
    };

    const handleNext = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length < 14) return;

        setLoading(true);
        try {
            const cleanPhone = phone.replace(/\D/g, '');
            const client = await clientService.getByPhone(tenant.id, cleanPhone);

            if (client) {
                // Cliente já existe -> LOGIN DIRETO
                login(client);
            } else {
                // Novo cliente -> Pedir nome
                setStep('name');
            }
        } catch (error) {
            console.error('Error in fast login:', error);
            alert('Erro ao verificar acesso. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            const cleanPhone = phone.replace(/\D/g, '');
            // Registro sem senha (passwordless)
            const client = await clientService.register(tenant.id, {
                name: name.trim(),
                phone: cleanPhone,
                password: '' // Vazio para login por telefone
            });
            login(client);
        } catch (error) {
            console.error('Error in registration:', error);
            alert('Erro ao criar seu acesso.');
        } finally {
            setLoading(false);
        }
    };

    const login = (client: any) => {
        const sessionData = {
            id: client.id, // Adicionado para compatibilidade
            clientId: client.id,
            phone: client.phone,
            name: client.name,
            tenantId: tenant.id
        };

        localStorage.setItem(`client_session_${tenant.slug}`, JSON.stringify(sessionData));
        onLogin(sessionData);
    };

    const handleWhatsAppLogin = () => {
        const message = encodeURIComponent(`Olá! Gostaria de agendar um horário na ${appConfig?.name || 'barbearia'}.`);
        window.open(`https://wa.me/${tenant?.settings?.app_config?.general?.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-700"
            style={{
                backgroundColor: primaryColor,
                backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, #000000 150%)`
            }}
        >
            {/* Header com Logo */}
            <div className="mb-10 text-center animate-in fade-in zoom-in duration-700">
                {appConfig?.logoPreview ? (
                    <div className="w-28 h-28 mx-auto mb-6 rounded-3xl overflow-hidden bg-white shadow-2xl p-1 border-4 border-gray-900/50">
                        <img
                            src={appConfig.logoPreview}
                            alt={appConfig.name}
                            className="w-full h-full object-cover rounded-2xl"
                        />
                    </div>
                ) : (
                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gray-900 flex items-center justify-center border-2 border-gray-800 shadow-xl">
                        <Star className="text-primary-500" size={32} />
                    </div>
                )}
                <h1 className="text-3xl font-black text-white tracking-tight">{appConfig?.name || 'BarberMaster'}</h1>
                <p className="text-gray-500 text-sm mt-2 font-medium">Sua beleza em boas mãos</p>
            </div>

            {/* Card de Ação */}
            <div className="w-full max-w-sm animate-in slide-in-from-bottom-8 duration-500">
                <div className="bg-gray-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    {/* Efeito Glow no fundo do card */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl -mr-16 -mt-16"></div>

                    {step === 'phone' ? (
                        <form onSubmit={handleNext} className="space-y-6 relative">
                            <div className="text-center mb-4">
                                <h2 className="text-xl font-bold text-white">Acesso Rápido</h2>
                                <p className="text-gray-400 text-xs mt-1">Entre com seu WhatsApp para agendar</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Seu Telefone</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        placeholder="(00) 00000-0000"
                                        className="w-full bg-gray-950/50 border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white text-lg font-bold focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-gray-700"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || phone.length < 14}
                                className="w-full py-4 rounded-2xl font-black text-dark-950 text-lg shadow-xl shadow-primary-500/20 transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {loading ? 'Carregando...' : (
                                    <>Acessar App <ArrowRight size={20} /></>
                                )}
                            </button>

                            <div className="flex items-center gap-4 py-2">
                                <div className="h-px flex-1 bg-gray-800"></div>
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">ou</span>
                                <div className="h-px flex-1 bg-gray-800"></div>
                            </div>

                            <button
                                type="button"
                                onClick={handleWhatsAppLogin}
                                className="w-full py-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-[#25D366]/20"
                            >
                                <MessageCircle size={20} /> Entrar via WhatsApp
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-6 relative">
                            <div className="text-center mb-4">
                                <h2 className="text-xl font-bold text-white">Quase lá!</h2>
                                <p className="text-gray-400 text-xs mt-1">Como devemos te chamar?</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Seu Nome</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Seu nome completo"
                                        className="w-full bg-gray-950/50 border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white text-lg font-bold focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="bg-primary-500/5 p-4 rounded-2xl border border-primary-500/10 flex items-start gap-3">
                                <ShieldCheck className="text-primary-500 shrink-0" size={18} />
                                <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                                    Seus dados estão seguros. Usamos seu telefone apenas para gerenciar seus agendamentos e pontos de fidelidade.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className="w-full py-4 rounded-2xl font-black text-dark-950 text-lg shadow-xl shadow-primary-500/20 transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {loading ? 'Criando conta...' : (
                                    <>Finalizar e Entrar <ArrowRight size={20} /></>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('phone')}
                                className="w-full text-xs font-bold text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                Voltar e alterar telefone
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-10 text-center space-y-2 opacity-50">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Seguro • Rápido • Gratuito
                </p>
            </div>
        </div>
    );
};

export default ClientLogin;
