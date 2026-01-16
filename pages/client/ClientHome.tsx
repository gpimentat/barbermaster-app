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

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header com Capa */}
            <div
                className="relative h-48 bg-gradient-to-br from-gray-800 to-gray-900"
                style={{
                    backgroundImage: general?.coverPreview ? `url(${general.coverPreview})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-950"></div>

                {/* Logo e Nome */}
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

            <div className="px-6 -mt-6 pb-6 space-y-6">
                {/* Saudação */}
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <p className="text-gray-400 text-sm">Olá,</p>
                    <p className="text-white text-xl font-bold">{clientData?.name || 'Cliente'}! 👋</p>
                </div>

                {/* Próximo Agendamento */}
                {nextAppointment ? (
                    <div
                        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border-2 shadow-lg"
                        style={{ borderColor: primaryColor }}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide font-bold" style={{ color: primaryColor }}>Próximo Corte</p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {formatDate(nextAppointment.date)}, {nextAppointment.time}
                                </p>
                            </div>
                            <div className="bg-white/10 p-3 rounded-xl">
                                <Calendar className="text-white" size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300 mb-3">
                            <Clock size={16} />
                            <span className="text-sm">
                                Com {nextAppointment.barber?.name} - {nextAppointment.service?.name}
                            </span>
                        </div>
                        <button
                            onClick={() => navigate(`/app/${tenant.slug}/booking`)}
                            className="w-full py-2.5 rounded-lg font-bold text-dark-950 transition-all"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Ver Detalhes
                        </button>
                    </div>
                ) : (
                    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 text-center">
                        <Calendar className="mx-auto text-gray-600 mb-2" size={48} />
                        <p className="text-white font-bold mb-1">Nenhum agendamento</p>
                        <p className="text-gray-400 text-sm mb-4">Agende seu próximo corte agora!</p>
                        <button
                            onClick={() => navigate(`/app/${tenant.slug}/booking`)}
                            className="w-full py-3 rounded-xl font-bold text-dark-950 text-lg shadow-lg transition-all hover:scale-105"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Calendar className="inline-block mr-2" size={20} />
                            Agendar Horário
                        </button>
                    </div>
                )}

                {/* Cartão Fidelidade */}
                {features?.loyaltyProgram && (
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-gray-700 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-xs text-gray-400">Seus Pontos</p>
                                <p className="text-3xl font-bold text-white">{loyaltyPoints}</p>
                            </div>
                            <div
                                className="px-4 py-2 rounded-full text-xs font-bold"
                                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                            >
                                {loyaltyPoints >= 500 ? '⭐ Platinum' : loyaltyPoints >= 300 ? '🥇 Gold' : '🥈 Silver'}
                            </div>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full transition-all"
                                style={{
                                    width: `${Math.min((loyaltyPoints / 500) * 100, 100)}%`,
                                    backgroundColor: primaryColor
                                }}
                            ></div>
                        </div>
                        <p className="text-xs text-gray-500">
                            {loyaltyPoints >= 500 ? 'Você atingiu o nível máximo!' : `Faltam ${500 - loyaltyPoints} pontos para Platinum`}
                        </p>
                    </div>
                )}

                {/* Informações de Contato */}
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <h3 className="text-white font-bold mb-3">Informações</h3>
                    <div className="space-y-3">
                        {general?.phone && (
                            <div className="flex items-center gap-3">
                                <Phone size={18} className="text-gray-400" />
                                <span className="text-gray-300">{general.phone}</span>
                            </div>
                        )}
                        {general?.address && (
                            <div className="flex items-center gap-3">
                                <MapPin size={18} className="text-gray-400" />
                                <span className="text-gray-300">{general.address}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Serviços */}
                {services.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Nossos Serviços</h2>
                            <button
                                onClick={() => navigate(`/app/${tenant.slug}/booking`)}
                                className="text-sm font-medium"
                                style={{ color: primaryColor }}
                            >
                                Ver todos
                            </button>
                        </div>

                        <div className="space-y-3">
                            {services.map(service => (
                                <div key={service.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: `${primaryColor}20` }}
                                        >
                                            <Star style={{ color: primaryColor }} size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{service.name}</p>
                                            <p className="text-xs text-gray-400">{service.duration || '30'} min</p>
                                        </div>
                                    </div>
                                    <p className="text-lg font-bold text-white">
                                        R$ {parseFloat(service.price || 0).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientHome;
