import React from 'react';
import { Scissors, Ticket, Calendar } from 'lucide-react';

interface ServiceItem {
    date: string;
    clientName: string;
    serviceName: string;
    price: number;
    commission: number;
}

interface BarberFinancialProps {
    barberName: string;
    avatar: string;
    commissionRate: number;
    serviceCount: number;
    totalCommission: number;
    totalPayout: number; // Rateio + Comissão
    chipBalance: number;
    chipValue: number;
    services: ServiceItem[];
    isAdminView?: boolean;
}

const BarberFinancialDashboard: React.FC<BarberFinancialProps> = ({
    barberName,
    avatar,
    commissionRate,
    serviceCount,
    totalCommission,
    chipBalance,
    chipValue,
    services,
    isAdminView = false
}) => {
    return (
        <div className="space-y-6 animate-in fade-in">
            {!isAdminView && (
                <div className="flex items-center gap-4 mb-6">
                    <img src={avatar} className="w-16 h-16 rounded-full border-2 border-primary-500" />
                    <div>
                        <h1 className="text-3xl font-bold text-white">Minhas Comissões</h1>
                        <p className="text-gray-400">Acompanhe seus ganhos em tempo real.</p>
                    </div>
                </div>
            )}

            {/* Cards de Resumo Pessoal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-400 font-medium">Comissão (Serviços Avulsos)</p>
                        <Scissors className="text-blue-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-white">R$ {totalCommission.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-2">Baseado em {commissionRate}% de {serviceCount} serviços</p>
                </div>
                <div className="bg-dark-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-400 font-medium">Rateio (Assinantes)</p>
                        <Ticket className="text-green-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-white">R$ {chipValue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-2">Você tem {chipBalance} fichas acumuladas</p>
                </div>
            </div>

            {isAdminView && (
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 font-medium text-sm">Total a Pagar</p>
                        <p className="text-4xl font-bold text-green-500">R$ {(totalCommission + chipValue).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Comissão + Rateio</p>
                    </div>
                </div>
            )}

            {/* Lista de Detalhes */}
            <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white">Últimos Serviços Comissionados</h2>
                </div>
                <div className="p-6">
                    {services.length ? (
                        <div className="space-y-3">
                            {services.map((service, index) => (
                                <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-gray-800 border border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-900 rounded-lg text-gray-400">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm">{service.serviceName}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{service.clientName}</span>
                                                <span>•</span>
                                                <span>{new Date(service.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Total: R$ {service.price.toFixed(2)}</p>
                                        <p className="text-sm font-bold text-green-500">+ R$ {service.commission.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">Nenhum serviço registrado.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BarberFinancialDashboard;
