
import React, { useState, useMemo, useEffect } from 'react';
import {
    Users,
    TrendingUp,
    DollarSign,
    Download,
    Filter,
    Briefcase,
    X,
    CheckCircle2,
    Calendar,
    User,
    Scissors,
    Ticket,
    Percent,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { Barber, Transaction, PaymentMethod, Service, Client, Comanda } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../src/supabaseClient';
import { MOCK_SUBSCRIPTION_PLANS } from '../constants'; // Using mock plans as table is missing
import BarberFinancialDashboard from '../components/BarberFinancialDashboard';

interface BarberStandardStats extends Barber {
    totalGenerated: number;
    serviceCount: number;
    averageTicket: number;
    commissionValue: number;
    servicesList: Array<{
        date: string;
        clientName: string;
        serviceName: string;
        price: number;
        commission: number;
    }>;
}

const CommissionsPage: React.FC = () => {
    const { role, currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'standard' | 'chips'>('standard');
    const [selectedBarber, setSelectedBarber] = useState<BarberStandardStats | null>(null);
    const [mrrAllocationPercentage, setMrrAllocationPercentage] = useState(40);
    const [loading, setLoading] = useState(true);
    const [dbBarbers, setDbBarbers] = useState<Barber[]>([]);
    const [dbComandas, setDbComandas] = useState<any[]>([]);
    const [dbClients, setDbClients] = useState<Client[]>([]);
    const [dbServices, setDbServices] = useState<Service[]>([]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Barbers/Staff
            const { data: barbersData } = await supabase.from('profiles').select('*');

            // 2. Fetch Paid Comandas and their items
            const { data: comandasData } = await supabase
                .from('comandas')
                .select(`
          *,
          comanda_items (*)
        `)
                .eq('status', 'paid');

            // 3. Fetch Clients (to check subscription)
            const { data: clientsData } = await supabase.from('clients').select('*');

            // 4. Fetch Services (for chips)
            const { data: servicesData } = await supabase.from('services').select('*');

            setDbBarbers(barbersData?.filter(b =>
                b.role?.toLowerCase().includes('barber') ||
                b.role?.toLowerCase().includes('barbeiro')
            ).map(b => ({
                id: b.id,
                name: b.name,
                role: b.role,
                avatar: b.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=random`,
                commissionRate: Number(b.commission_rate) || 0,
                active: b.active
            })) || []);

            setDbComandas(comandasData || []);
            setDbClients(clientsData || []);
            setDbServices(servicesData?.map(s => ({
                id: s.id,
                name: s.name,
                price: Number(s.price),
                durationMinutes: s.duration_minutes,
                chips: Number(s.chips) || 0
            })) || []);

        } catch (error) {
            console.error('Erro ao buscar dados de comissões:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- LÓGICA DE DADOS ---
    const standardStats = useMemo(() => {
        return dbBarbers.map(barber => {
            const barberServices = dbComandas.flatMap(comanda => {
                const client = dbClients.find(c => c.id === comanda.client_id);
                // Ignore if client has active subscription (those go to chips allocation)
                if (client?.subscriptionStatus === 'active') return [];

                return (comanda.comanda_items || [])
                    .filter((item: any) => item.type === 'service' && item.barber_id === barber.id)
                    .map((item: any) => ({
                        date: comanda.close_date || comanda.open_date,
                        clientName: comanda.client_name,
                        serviceName: item.name,
                        price: Number(item.price) * (item.quantity || 1),
                        commission: (Number(item.price) * (item.quantity || 1)) * (barber.commissionRate / 100)
                    }));
            });

            const totalGenerated = barberServices.reduce((acc, s) => acc + s.price, 0);
            const commissionValue = barberServices.reduce((acc, s) => acc + s.commission, 0);
            const serviceCount = barberServices.length;

            return {
                ...barber,
                totalGenerated,
                serviceCount,
                averageTicket: serviceCount > 0 ? totalGenerated / serviceCount : 0,
                commissionValue,
                servicesList: barberServices as any
            };
        }).sort((a, b) => b.commissionValue - a.commissionValue);
    }, [dbBarbers, dbComandas, dbClients]);

    // --- LÓGICA RATEIO ---
    const chipStatsData = useMemo(() => {
        // Calculate MRR from active subscribers
        const activeSubscribers = dbClients.filter(c => c.subscriptionStatus === 'active');
        const totalMRR = activeSubscribers.reduce((acc, client) => {
            const plan = MOCK_SUBSCRIPTION_PLANS.find(p => p.id === client.subscriptionPlanId);
            return acc + (plan?.price || 0);
        }, 0);

        const distributionPot = totalMRR * (mrrAllocationPercentage / 100);

        let globalTotalChips = 0;
        const barberChipData = dbBarbers.map(barber => {
            let barberChips = 0;
            let servicesCount = 0;
            dbComandas.forEach(comanda => {
                const client = dbClients.find(c => c.id === comanda.client_id);
                if (client?.subscriptionStatus === 'active') {
                    (comanda.comanda_items || []).forEach((item: any) => {
                        if (item.type === 'service' && item.barber_id === barber.id) {
                            const serviceDef = dbServices.find(s => s.id === item.item_id);
                            barberChips += ((serviceDef?.chips || 0) * (item.quantity || 1));
                            servicesCount++;
                        }
                    });
                }
            });
            globalTotalChips += barberChips;
            return {
                ...barber,
                totalChips: barberChips,
                serviceCount: servicesCount,
                sharePercentage: 0,
                payoutValue: 0
            };
        });

        const finalStats = barberChipData.map(b => {
            const share = globalTotalChips > 0 ? b.totalChips / globalTotalChips : 0;
            return { ...b, sharePercentage: share * 100, payoutValue: distributionPot * share };
        }).sort((a, b) => b.payoutValue - a.payoutValue);

        return { totalMRR, distributionPot, globalTotalChips, stats: finalStats };
    }, [dbBarbers, dbComandas, dbClients, dbServices, mrrAllocationPercentage]);


    // ========================================================
    // RENDERIZAÇÃO: MODO BARBEIRO (VISÃO INDIVIDUAL)
    // ========================================================
    if (role === 'barber' && currentUser) {
        if (loading) return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="animate-spin text-primary-500" size={48} />
            </div>
        );

        const myStats = standardStats.find(s => s.id === currentUser.id);
        const myChips = chipStatsData.stats.find(s => s.id === currentUser.id);

        return (
            <BarberFinancialDashboard
                barberName={currentUser.name}
                avatar={currentUser.avatar || ''}
                commissionRate={myStats?.commissionRate || 0}
                serviceCount={myStats?.serviceCount || 0}
                totalCommission={myStats?.commissionValue || 0}
                totalPayout={(myStats?.commissionValue || 0) + (myChips?.payoutValue || 0)}
                chipBalance={myChips?.totalChips || 0}
                chipValue={myChips?.payoutValue || 0}
                services={myStats?.servicesList || []}
                isAdminView={false}
            />
        );
    }

    // ========================================================
    // RENDERIZAÇÃO: MODO ADMIN / FINANCEIRO
    // ========================================================
    return (
        <div className="space-y-6">
            {/* ... (Admin Header and Tabs remain same) ... */}

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Gestão de Comissões</h1>
                    <p className="text-gray-400">Controle total de pagamentos e rateios.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
                        <Filter size={18} /> Mês Atual
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-dark-950 font-bold rounded-lg hover:bg-primary-600 transition-colors">
                        <Download size={18} /> Relatório
                    </button>
                </div>
            </div>

            {/* Navegação de Abas */}
            <div className="flex space-x-1 bg-dark-900 p-1 rounded-xl border border-gray-800 w-fit">
                <button
                    onClick={() => setActiveTab('standard')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'standard' ? 'bg-primary-500 text-dark-950 shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    Comissão Direta
                </button>
                <button
                    onClick={() => setActiveTab('chips')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'chips' ? 'bg-primary-500 text-dark-950 shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <Ticket size={16} /> Rateio Assinaturas
                </button>
            </div>

            {/* --- ABA PADRÃO (ADMIN) --- */}
            {activeTab === 'standard' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-dark-900 p-6 rounded-xl border border-gray-800 flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium">Faturamento (Avulso)</p>
                                <p className="text-3xl font-bold text-white mt-1">R$ {standardStats.reduce((acc, s) => acc + s.totalGenerated, 0).toFixed(2)}</p>
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-xl text-blue-500"><TrendingUp size={32} /></div>
                        </div>
                        <div className="bg-dark-900 p-6 rounded-xl border border-gray-800 flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium">Comissões a Pagar</p>
                                <p className="text-3xl font-bold text-primary-500 mt-1">R$ {standardStats.reduce((acc, s) => acc + s.commissionValue, 0).toFixed(2)}</p>
                            </div>
                            <div className="p-4 bg-primary-500/10 rounded-xl text-primary-500"><DollarSign size={32} /></div>
                        </div>
                    </div>

                    <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white">Detalhamento por Profissional</h2>
                            {loading && <Loader2 className="animate-spin text-primary-500" size={20} />}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-gray-400">
                                <thead className="bg-gray-900/50 text-xs uppercase font-semibold text-gray-500">
                                    <tr>
                                        <th className="px-6 py-4">Profissional</th>
                                        <th className="px-6 py-4 text-center">Taxa</th>
                                        <th className="px-6 py-4 text-center">Serviços</th>
                                        <th className="px-6 py-4 text-right">Gerado</th>
                                        <th className="px-6 py-4 text-right">Comissão</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {standardStats.map(barber => (
                                        <tr key={barber.id} className="hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={barber.avatar} className="w-10 h-10 rounded-full object-cover" />
                                                    <div><p className="font-bold text-white">{barber.name}</p><p className="text-xs text-gray-500">{barber.role}</p></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center"><span className="bg-gray-800 px-2 py-1 rounded text-xs font-bold">{barber.commissionRate}%</span></td>
                                            <td className="px-6 py-4 text-center">{barber.serviceCount}</td>
                                            <td className="px-6 py-4 text-right font-medium text-white">R$ {barber.totalGenerated.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right"><span className="text-lg font-bold text-primary-500">R$ {barber.commissionValue.toFixed(2)}</span></td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => setSelectedBarber(barber)} className="text-xs bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-dark-950 px-3 py-1.5 rounded font-bold transition-colors">Detalhes</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ABA FICHAS (ADMIN) --- */}
            {activeTab === 'chips' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700">
                        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Ticket className="text-primary-500" /> Pool de Rateio (Assinaturas)
                                </h2>
                                <div className="flex items-center gap-4 flex-wrap bg-black/20 p-4 rounded-xl border border-gray-700/50">
                                    <div className="flex flex-col">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">MRR Total</p>
                                        <p className="text-2xl font-bold text-white">R$ {chipStatsData.totalMRR.toFixed(2)}</p>
                                    </div>
                                    <div className="h-8 w-px bg-gray-700 mx-2"></div>
                                    <div className="flex flex-col">
                                        <p className="text-xs text-primary-500 uppercase font-bold mb-1 flex items-center gap-1">% Repasse</p>
                                        <div className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1 border border-gray-600 focus-within:border-primary-500">
                                            <input type="number" value={mrrAllocationPercentage} onChange={(e) => setMrrAllocationPercentage(Number(e.target.value))} className="w-12 bg-transparent text-white font-bold text-lg focus:outline-none text-center" />
                                            <Percent size={14} className="text-primary-500" />
                                        </div>
                                    </div>
                                    <div className="h-8 w-px bg-gray-700 mx-2"></div>
                                    <div className="flex flex-col">
                                        <p className="text-xs text-green-500 uppercase font-bold mb-1">Valor do Rateio</p>
                                        <p className="text-2xl font-bold text-green-500">R$ {chipStatsData.distributionPot.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-400 mb-1">Total de Fichas</p>
                                <p className="text-4xl font-black text-white">{chipStatsData.globalTotalChips}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
                        <div className="p-6 border-b border-gray-800"><h2 className="text-lg font-bold text-white">Distribuição por Fichas</h2></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-gray-400">
                                <thead className="bg-gray-900/50 text-xs uppercase font-semibold text-gray-500">
                                    <tr>
                                        <th className="px-6 py-4">Profissional</th>
                                        <th className="px-6 py-4 text-center">Fichas</th>
                                        <th className="px-6 py-4 text-center">Participação</th>
                                        <th className="px-6 py-4 text-right">A Receber</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {chipStatsData.stats.map(barber => (
                                        <tr key={barber.id} className="hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white flex items-center gap-2"><img src={barber.avatar} className="w-8 h-8 rounded-full" /> {barber.name}</td>
                                            <td className="px-6 py-4 text-center"><span className="bg-gray-800 px-3 py-1 rounded-full text-sm font-bold text-white">{barber.totalChips}</span></td>
                                            <td className="px-6 py-4 text-center text-sm font-bold">{barber.sharePercentage.toFixed(1)}%</td>
                                            <td className="px-6 py-4 text-right"><span className="text-xl font-bold text-green-500">R$ {barber.payoutValue.toFixed(2)}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalhes (Admin Only) */}
            {selectedBarber && role === 'admin' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50">
                            <div className="flex items-center gap-3">
                                <img src={selectedBarber.avatar} className="w-12 h-12 rounded-full border border-gray-700" />
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedBarber.name}</h2>
                                    <p className="text-sm text-gray-400">Visão Detalhada</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedBarber(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-dark-950">
                            <BarberFinancialDashboard
                                barberName={selectedBarber.name}
                                avatar={selectedBarber.avatar}
                                commissionRate={selectedBarber.commissionRate}
                                serviceCount={selectedBarber.serviceCount}
                                totalCommission={selectedBarber.commissionValue}
                                totalPayout={selectedBarber.commissionValue + (chipStatsData.stats.find(s => s.id === selectedBarber.id)?.payoutValue || 0)}
                                chipBalance={chipStatsData.stats.find(s => s.id === selectedBarber.id)?.totalChips || 0}
                                chipValue={chipStatsData.stats.find(s => s.id === selectedBarber.id)?.payoutValue || 0}
                                services={selectedBarber.servicesList}
                                isAdminView={true}
                            />
                        </div>

                        <div className="p-6 border-t border-gray-800 flex gap-3 h-24 items-center">
                            <button onClick={() => setSelectedBarber(null)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold">Fechar</button>
                            <button onClick={async () => {
                                const totalPayout = selectedBarber.commissionValue + (chipStatsData.stats.find(s => s.id === selectedBarber.id)?.payoutValue || 0);
                                if (window.confirm(`Pagar R$ ${totalPayout.toFixed(2)} (${selectedBarber.name})?`)) {
                                    try {
                                        const { error } = await supabase.from('transactions').insert([{
                                            date: new Date().toISOString().split('T')[0],
                                            description: `Pagamento Comissão/Rateio: ${selectedBarber.name}`,
                                            amount: totalPayout,
                                            type: 'expense',
                                            category: 'Comissões',
                                            method: PaymentMethod.PIX,
                                            tenant_id: currentUser?.tenantId
                                        }]);

                                        if (error) throw error;
                                        alert('Pagamento registrado com sucesso!');
                                        setSelectedBarber(null);
                                    } catch (err: any) {
                                        alert('Erro ao registrar pagamento: ' + err.message);
                                    }
                                }
                            }} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                                <CheckCircle2 size={20} /> Pagar Total
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommissionsPage;
