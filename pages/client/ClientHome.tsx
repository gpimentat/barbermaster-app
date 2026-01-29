import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Gift, Star, TrendingUp, Phone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../src/supabaseClient';
import clientService from '../../src/services/clientService';

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

    const appConfig = tenant?.settings?.app_config;
    const general = appConfig?.general;
    const features = appConfig?.features;
    const primaryColor = general?.primaryColor || '#eab308';

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
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
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
                        className="relative h-48 bg-gradient-to-br from-gray-800 to-gray-900 animate-in fade-in duration-500"
                        style={{
                            backgroundImage: general?.coverPreview ? `url(${general.coverPreview})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-950"></div>
                        <div className="relative pt-6 px-6">
                            <div className="flex items-center gap-3">
                                {general?.logoPreview && (
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-lg">
                                        <img src={general.logoPreview} alt={general.name} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl font-bold text-white">{general?.name || 'BarberMaster'}</h1>
                                    <p className="text-sm text-gray-300">{general?.slogan || 'O melhor corte da cidade'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 pb-6">
            {renderHeader()}

            <div className={`px-6 space-y-6 ${homeStyle === 'classic' ? '-mt-6' : 'mt-6'}`}>
                {/* Saudação */}
                <div className={`bg-gray-900/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-800 flex items-center justify-between transition-all hover:border-gray-700`}>
                    <div>
                        <p className="text-gray-400 text-xs">Acesso restrito para</p>
                        <p className="text-white text-lg font-black">{clientData?.name || 'Cliente'}! 👋</p>
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
                        className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border-2 shadow-2xl transition-transform active:scale-[0.98]`}
                        style={{ borderColor: primaryColor }}
                    >
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

                {/* Serviços em Destaque */}
                {services.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className={`font-black text-white ${homeStyle === 'modern' ? 'text-2xl' : 'text-lg'}`}>Sugestões para Você</h2>
                            <button
                                onClick={() => navigate(`/app/${tenant.slug}/booking`)}
                                className="text-xs font-black uppercase tracking-widest p-2"
                                style={{ color: primaryColor }}
                            >
                                Ver Tudo
                            </button>
                        </div>

                        <div className="space-y-4">
                            {services.map(service => (
                                <div key={service.id} className="bg-gray-950 rounded-2xl p-4 border border-gray-900 group flex items-center justify-between transition-all hover:bg-gray-900 hover:border-gray-800">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}20` }}
                                        >
                                            <Star style={{ color: primaryColor }} size={24} fill={primaryColor} />
                                        </div>
                                        <div>
                                            <p className="font-black text-white text-base">{service.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-bold text-gray-600">{service.duration || '30'} MIN</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                                                <span className="text-xs font-black" style={{ color: primaryColor }}>R$ {parseFloat(service.price || 0).toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/app/${tenant.slug}/booking`)}
                                        className="p-3 bg-gray-900 text-white rounded-xl hover:bg-white hover:text-dark-950 transition-all font-bold"
                                    >
                                        <Calendar size={18} />
                                    </button>
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
