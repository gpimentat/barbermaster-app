import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Gift, Star, TrendingUp, Phone, MapPin, Bell, X, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../src/supabaseClient';
import clientService from '../../src/services/clientService';
import PWAInstallPrompt from '../../components/client/PWAInstallPrompt';
import { updateDynamicManifest } from '../../src/utils/pwaUtils';

interface ClientHomeProps {
    tenant: any;
    clientData: any;
}

const ClientHome: React.FC<ClientHomeProps> = ({ tenant, clientData }) => {
    const navigate = useNavigate();
    const [nextAppointment, setNextAppointment] = useState<any>(null);
    const [loyaltyPoints, setLoyaltyPoints] = useState(0);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPushPrompt, setShowPushPrompt] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);

    const appConfig = tenant?.settings?.app_config;
    const general = appConfig?.general;
    const features = appConfig?.features;
    const primaryColor = general?.primaryColor || '#eab308';

    useEffect(() => {
        if (tenant) {
            updateDynamicManifest(tenant);
        }
    }, [tenant]);

    useEffect(() => {
        loadData();
    }, [clientData]);

    const loadData = async () => {
        try {
            // Carregar próximo agendamento
            if (clientData?.clientId) {
                const appointments = await clientService.getAppointments(clientData.clientId);
                const upcoming = appointments.find((apt: any) =>
                    apt.status === 'pending' || apt.status === 'confirmed'
                );
                setNextAppointment(upcoming);

                // Carregar pontos de fidelidade
                const client = await clientService.getById(clientData.clientId);
                if (client) {
                    setLoyaltyPoints(client.loyalty_points);
                }
            }

            // Carregar serviços
            const { data: servicesData } = await supabase
                .from('services')
                .select('*')
                .eq('tenant_id', tenant.id)
                .limit(3);

            if (servicesData) setServices(servicesData);

            // Verificar se deve mostrar prompt de notificação
            const isSubscribed = await clientService.checkPushSubscription();
            const isDismissed = localStorage.getItem('push_prompt_dismissed');
            if (!isSubscribed && !isDismissed) {
                setShowPushPrompt(true);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnablePush = async () => {
        if (!clientData?.clientId) return;
        setPushLoading(true);
        try {
            await clientService.subscribeToPush(clientData.clientId, tenant.id);
            setShowPushPrompt(false);
            alert('✅ Notificações ativadas! Agora você não perde nenhum horário.');
        } catch (error: any) {
            console.error('Push subscription error:', error);
            // Se for negado, não mostramos erro invasivo, apenas logamos
            if (error.message === 'Permissão negada') {
                setShowPushPrompt(false);
                localStorage.setItem('push_prompt_dismissed', 'true');
            }
        } finally {
            setPushLoading(false);
        }
    };

    const handleDismissPush = () => {
        setShowPushPrompt(false);
        localStorage.setItem('push_prompt_dismissed', 'true');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
            </div>
        );
    }

    const homeStyle = appConfig?.layout?.homeStyle || 'classic';

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
            </div>
        );
    }

    const renderHeader = () => {
        switch (homeStyle) {
            case 'modern':
                return (
                    <div className="relative h-64 bg-gray-900 overflow-hidden">
                        <img
                            src={general?.coverPreview || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop'}
                            className="w-full h-full object-cover opacity-40"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>
                        <div className="absolute bottom-10 left-6 right-6 flex items-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 bg-gray-800 shadow-2xl backdrop-blur-md">
                                <img src={general?.logoPreview} className="w-full h-full object-cover" />
                            </div>
                            <div className="mb-1">
                                <h1 className="text-2xl font-black text-white leading-tight">{general?.name || 'BarberMaster'}</h1>
                                <div className="flex items-center gap-1 text-primary-500 font-bold text-xs uppercase tracking-widest">
                                    <Star size={12} fill="currentColor" /> {general?.slogan || 'Premium Experience'}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'minimal':
                return (
                    <div className="pt-12 px-6 pb-6 bg-gray-950 border-b border-gray-900 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2" style={{ borderColor: primaryColor }}>
                                    <img src={general?.logoPreview} className="w-full h-full object-cover" />
                                </div>
                                <h1 className="text-xl font-bold text-white tracking-tight">{general?.name}</h1>
                            </div>
                            <div className="p-2 bg-gray-900 rounded-lg text-gray-400">
                                <MapPin size={20} />
                            </div>
                        </div>
                    </div>
                );
            case 'classic':
            default:
                return (
                    <div
                        className="relative h-56 bg-gradient-to-br from-gray-800 to-gray-900 animate-in fade-in duration-700"
                        style={{
                            backgroundImage: general?.coverPreview ? `linear-gradient(rgba(0,0,0,0.2), rgba(15,23,42,1)), url(${general.coverPreview})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-950"></div>
                        <div className="relative pt-12 px-6">
                            <div className="flex flex-col items-center text-center gap-4">
                                {general?.logoPreview && (
                                    <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white shadow-2xl p-1 border-4 border-gray-950">
                                        <img src={general.logoPreview} alt={general.name} className="w-full h-full object-contain rounded-2xl" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-2xl font-black text-white tracking-tight leading-tight">{general?.name || 'BarberMaster'}</h1>
                                    <p className="text-[10px] text-primary-500 font-bold uppercase tracking-[0.3em] mt-1">{general?.slogan || 'O melhor corte da cidade'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 pb-6">
            <PWAInstallPrompt primaryColor={primaryColor} />
            {renderHeader()}

            <div className={`px-6 space-y-6 ${homeStyle === 'classic' ? '-mt-6' : 'mt-6'}`}>
                {/* Prompt de Notificação Persistente */}
                {showPushPrompt && (
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-5 border border-primary-500/20 shadow-2xl animate-in slide-in-from-top-4 duration-500 relative overflow-hidden group">
                        {/* Botão X Discreto */}
                        <button
                            onClick={handleDismissPush}
                            className="absolute top-3 right-3 p-1 text-gray-700 hover:text-gray-400 transition-colors z-20"
                        >
                            <X size={14} />
                        </button>

                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all"></div>

                        <div className="flex items-start gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center shrink-0 border border-primary-500/20">
                                <Bell className="text-primary-500 animate-bounce" size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-1">Ativar Avisos? 🔔</h3>
                                <p className="text-gray-400 text-xs leading-relaxed mb-4">
                                    Receba lembretes automáticos dos seus agendamentos e promoções exclusivas.
                                </p>
                                <button
                                    onClick={handleEnablePush}
                                    disabled={pushLoading}
                                    className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
                                >
                                    {pushLoading ? 'Ativando...' : 'Ativar Agora'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Saudação */}
                <div className={`bg-gray-900/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/5 flex items-center justify-between transition-all hover:bg-gray-900/80 shadow-2xl`}>
                    <div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Bem-vindo(a),</p>
                        <p className="text-white text-xl font-black italic">{clientData?.name?.split(' ')[0] || 'Cliente'}! 👋</p>
                    </div>
                    {homeStyle === 'minimal' && (
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Pontos</p>
                            <p className="text-primary-500 font-bold">{loyaltyPoints}</p>
                        </div>
                    )}
                </div>

                {/* Próximo Agendamento */}
                {nextAppointment ? (
                    <div
                        className={`bg-gray-900/80 backdrop-blur-md rounded-[2.5rem] p-8 border-t-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.98] relative overflow-hidden`}
                        style={{ borderTopColor: primaryColor }}
                    >
                        {/* Efeito de luz de fundo */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20" style={{ backgroundColor: primaryColor }}></div>

                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] font-black mb-1" style={{ color: primaryColor }}>Próximo Corte</p>
                                    <p className="text-2xl font-black text-white mt-1">
                                        {formatDate(nextAppointment.date)}, {nextAppointment.time}
                                    </p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                    <Calendar className="text-white" size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 mb-6 font-medium">
                                <Clock size={16} />
                                <span className="text-sm">
                                    {nextAppointment.barber?.name} • {nextAppointment.service?.name}
                                </span>
                            </div>
                            <button
                                onClick={() => navigate(`/app/${tenant.slug}/booking`)}
                                className="w-full py-4 rounded-xl font-black text-dark-950 transition-all shadow-lg active:translate-y-1"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Ver Detalhes do Horário
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-900/40 rounded-3xl p-8 border border-gray-800 text-center shadow-xl group hover:border-gray-700 transition-all">
                        <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-gray-800 transition-colors">
                            <Calendar className="text-gray-600 group-hover:text-primary-500 transition-colors" size={32} />
                        </div>
                        <p className="text-white font-black text-xl mb-2">Sem horários por aqui</p>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">Sua beleza não pode esperar. Que tal <br /> agendar um horário para hoje?</p>
                        <button
                            onClick={() => navigate(`/app/${tenant.slug}/booking`)}
                            className="w-full py-4 rounded-xl font-black text-dark-950 text-lg shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Agendar Novo Horário
                        </button>
                    </div>
                )}

                {/* Cartão Fidelidade (Não mostra no Minimal se já mostrado na saudação) */}
                {features?.loyaltyProgram && homeStyle !== 'minimal' && (
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-800 shadow-xl group hover:bg-gray-800/80 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1">Clube de Vantagens</p>
                                <p className="text-3xl font-black text-white">{loyaltyPoints}</p>
                                <p className="text-[10px] text-gray-600 uppercase font-black">pontos acumulados</p>
                            </div>
                            <div
                                className="px-4 py-2 rounded-2xl text-xs font-black shadow-lg"
                                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor, border: `1px solid ${primaryColor}30` }}
                            >
                                {loyaltyPoints >= 500 ? '⭐ Platinum Member' : loyaltyPoints >= 300 ? '🥇 Gold Member' : '🥈 Silver Member'}
                            </div>
                        </div>
                        <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden mb-3 border border-white/5">
                            <div
                                className="h-full transition-all duration-1000"
                                style={{
                                    width: `${Math.min((loyaltyPoints / 500) * 100, 100)}%`,
                                    backgroundColor: primaryColor,
                                    boxShadow: `0 0 10px ${primaryColor}50`
                                }}
                            ></div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-600 text-center uppercase tracking-wider">
                            {loyaltyPoints >= 500 ? 'Limite da conta atingido' : `Faltam apenas ${500 - loyaltyPoints} pontos para o nível Platinum`}
                        </p>
                    </div>
                )}

                {/* CLUBE DE VANTAGENS (PARCERIAS) */}
                {features?.partnersClub && (appConfig?.coupons || []).length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="flex items-center justify-between">
                            <h2 className="font-black text-white text-lg">Vantagens Exclusivas</h2>
                            <button
                                onClick={() => navigate(`/app/${tenant.slug}/partners`)}
                                className="text-xs font-black uppercase tracking-widest p-2"
                                style={{ color: primaryColor }}
                            >
                                Ver Todas
                            </button>
                        </div>
                        <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
                            {(appConfig.coupons || []).map((coupon: any) => (
                                <div
                                    key={coupon.id}
                                    className={`min-w-[200px] p-4 rounded-2xl border relative flex flex-col ${coupon.vipOnly ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/30' : 'bg-gray-900 border-gray-800'}`}
                                >
                                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1 truncate">{coupon.partnerName}</p>
                                    <p className={`font-black text-sm mb-3 ${coupon.vipOnly ? 'text-yellow-500' : 'text-primary-500'}`}>{coupon.offer}</p>
                                    <div className="bg-black/30 rounded-xl p-2 text-center border border-dashed border-gray-700">
                                        <span className="text-xs font-mono text-white font-bold">{coupon.code}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AVALIAÇÃO E FEEDBACK */}
                <div
                    onClick={() => navigate(`/app/${tenant.slug}/feedback`)}
                    className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary-600/20 to-transparent border border-white/5 relative overflow-hidden group active:scale-95 transition-all cursor-pointer"
                >
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} fill={primaryColor} stroke="none" />)}
                            </div>
                            <h3 className="font-black text-white uppercase tracking-tighter text-xl">Avalie seu Corte</h3>
                            <p className="text-xs text-gray-400">Suba uma foto e conte o que achou!</p>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                            <Camera size={24} style={{ color: primaryColor }} />
                        </div>
                    </div>
                    {/* Efeito de luz */}
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary-500/20 blur-[60px] rounded-full"></div>
                </div>

                {/* NOSSA GALERIA */}
                {features?.photoGallery && (appConfig?.gallery || []).length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <h2 className="font-black text-white text-lg">Nossa Galeria</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {(appConfig.gallery || []).filter((p: any) => p.status === 'approved').slice(0, 4).map((photo: any) => (
                                <div key={photo.id} className="aspect-square rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
                                    <img src={photo.url} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AVALIAÇÕES */}
                {features?.reviews && (appConfig?.feedbacks || []).length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <h2 className="font-black text-white text-lg">O que dizem os clientes</h2>
                        <div className="space-y-3">
                            {(appConfig.feedbacks || []).filter((f: any) => f.status === 'approved').slice(0, 3).map((feedback: any) => (
                                <div key={feedback.id} className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex text-yellow-500">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={10} fill={i < feedback.rating ? "currentColor" : "none"} className={i < feedback.rating ? "text-yellow-500" : "text-gray-700"} />
                                            ))}
                                        </div>
                                        <span className="text-white font-bold text-xs">{feedback.name}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs italic">"{feedback.text}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Localização e Contato Minimalista */}
                {homeStyle === 'minimal' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800 text-center">
                            <Phone className="mx-auto mb-2 text-gray-600" size={18} />
                            <p className="text-[10px] text-gray-500 uppercase font-black">Telefone</p>
                            <p className="text-white text-xs font-bold mt-1">{general?.phone || 'Indisponível'}</p>
                        </div>
                        <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800 text-center">
                            <MapPin className="mx-auto mb-2 text-gray-600" size={18} />
                            <p className="text-[10px] text-gray-500 uppercase font-black">Endereço</p>
                            <p className="text-white text-[10px] font-bold mt-1 truncate">{general?.address || 'Indisponível'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

};

export default ClientHome;
