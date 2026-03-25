import React, { useState, useMemo, useEffect } from 'react';
import {
    Crown,
    Check,
    Plus,
    Users,
    TrendingUp,
    MoreHorizontal,
    Edit2,
    Trash2,
    X,
    Save,
    ShieldCheck,
    Lightbulb,
    ArrowRight,
    Target,
    Package,
    Clock,
    Tag,
    Wallet,
    ArrowUpRight,
    Landmark,
    Key,
    ExternalLink,
    Loader2,
    Settings
} from 'lucide-react';
import { MOCK_APPOINTMENTS, MOCK_TRANSACTIONS } from '../constants';
import { SubscriptionPlan, ServicePackage, Transaction, PaymentMethod } from '../types';
import { useAuth } from '../AuthContext';
import subscriptionService from '../src/services/subscriptionService';
import { supabase } from '../src/supabaseClient';

const SubscriptionsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'plans' | 'packages' | 'wallet' | 'settings'>('plans');
    const [loading, setLoading] = useState(true);

    // State for Plans
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

    // State for Packages
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);

    // State for Subscriptions (Real)
    const [subscribers, setSubscribers] = useState<any[]>([]);

    // State for Gateway Settings
    const [gatewayConfig, setGatewayConfig] = useState({
        access_token: '',
        public_key: ''
    });

    // State for Wallet/Balance (Database driven)
    const [balanceData, setBalanceData] = useState<any>({ balance: 0, withdrawn_total: 0, pending_payout: 0 });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawForm, setWithdrawForm] = useState({
        amount: '',
        pixKey: '',
        pixKeyType: 'cpf',
        notes: ''
    });

    useEffect(() => {
        if (currentUser?.tenantId) {
            loadData();
        }
    }, [currentUser]);

    const loadData = async () => {
        try {
            setLoading(true);
            const tid = currentUser!.tenantId;
            const [plansData, pkgsData, subsData] = await Promise.all([
                subscriptionService.getPlans(tid),
                subscriptionService.getPackages(tid),
                subscriptionService.getClientSubscriptions(tid)
            ]);
            setPlans(plansData);
            setPackages(pkgsData);
            setSubscribers(subsData);

            // Load Wallet Data
            const [bal, txs, payouts] = await Promise.all([
                subscriptionService.getBalance(tid),
                subscriptionService.getTransactions(tid),
                subscriptionService.getPayoutRequests(tid)
            ]);
            setBalanceData(bal);
            setTransactions(txs);
            setPayoutRequests(payouts);

            // Load payout config from tenant settings if available
            if (currentUser?.settings?.payout_info) {
                setWithdrawForm(prev => ({ ...prev, ...currentUser.settings.payout_info }));
            }

            // Load gateway config from tenant settings if available
            if (currentUser?.settings?.gateways?.mercado_pago) {
                setGatewayConfig(currentUser.settings.gateways.mercado_pago);
            }

        } catch (err) {
            console.error('Error loading subscriptions data:', err);
        } finally {
            setLoading(false);
        }
    };

    const mrr = subscribers.filter(s => s.status === 'active').reduce((acc, sub) => {
        const plan = plans.find(p => p.id === sub.plan_id);
        return acc + (plan?.price || 0);
    }, 0);

    // --- LÓGICA DO CONSELHEIRO DE PREÇO ---
    const ticketMetrics = useMemo(() => {
        const totalRevenue = MOCK_APPOINTMENTS.reduce((acc, curr) => acc + curr.price, 0);
        const totalAppts = MOCK_APPOINTMENTS.length;
        const avgTicket = totalAppts > 0 ? totalRevenue / totalAppts : 0;

        return {
            avgTicket,
            suggestions: [
                { label: "Entrada", multiplier: 1.8, desc: "Garante o valor de quase 2 cortes.", suggestedName: "Básico" },
                { label: "Ideal", multiplier: 3, desc: "Ponto ideal. 3 visitas/mês.", recommended: true, suggestedName: "Vantagem" },
                { label: "VIP", multiplier: 5, desc: "Premium para acesso livre.", suggestedName: "VIP Ilimitado" }
            ]
        };
    }, []);

    // --- HANDLERS PARA NOVOS ITENS ---
    const handleNewPlan = () => {
        setSelectedPlan({
            id: '',
            name: '',
            price: 0,
            frequency: 'monthly',
            features: [''],
            active: true,
            tenant_id: currentUser?.tenantId || ''
        });
    };

    const handleNewPackage = () => {
        setSelectedPackage({
            id: '',
            name: '',
            price: 0,
            validityDays: 30,
            features: [''],
            active: true,
            tenant_id: currentUser?.tenantId || ''
        });
    };

    const handleUseSuggestion = (price: number, name: string) => {
        setSelectedPlan({
            id: '',
            name: name,
            price: parseFloat(price.toFixed(2)),
            frequency: 'monthly',
            features: ['Acesso preferencial na agenda', 'Sem custo adicional no balcão'],
            active: true,
            tenant_id: currentUser?.tenantId || ''
        });
    };

    // --- HANDLERS ---
    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlan || !currentUser) return;
        try {
            const cleanFeatures = selectedPlan.features.filter(f => f.trim() !== '');
            const saved = await subscriptionService.savePlan(currentUser.tenantId, { ...selectedPlan, features: cleanFeatures });

            if (plans.some(p => p.id === saved.id)) {
                setPlans(prev => prev.map(p => p.id === saved.id ? saved : p));
            } else {
                setPlans(prev => [...prev, saved]);
            }
            setSelectedPlan(null);
        } catch (err) {
            alert('Erro ao salvar plano');
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm('Excluir este plano?')) return;
        try {
            await subscriptionService.deletePlan(id);
            setPlans(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            alert('Erro ao deletar plano');
        }
    };

    const handleSavePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPackage || !currentUser) return;
        try {
            const cleanFeatures = selectedPackage.features.filter(f => f.trim() !== '');
            const saved = await subscriptionService.savePackage(currentUser.tenantId, { ...selectedPackage, features: cleanFeatures });

            if (packages.some(p => p.id === saved.id)) {
                setPackages(prev => prev.map(p => p.id === saved.id ? saved : p));
            } else {
                setPackages(prev => [...prev, saved]);
            }
            setSelectedPackage(null);
        } catch (err) {
            alert('Erro ao salvar pacote');
        }
    };

    const handleSaveGateway = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        try {
            const { error } = await supabase
                .from('tenants')
                .update({
                    settings: {
                        ...currentUser.settings,
                        payout_info: withdrawForm
                    }
                })
                .eq('id', currentUser.tenantId);

            if (error) throw error;
            alert('Dados de recebimento salvos com sucesso!');
        } catch (err) {
            alert('Erro ao salvar dados');
        }
    };

    const updatePlanField = (field: keyof SubscriptionPlan, value: any) => {
        if (selectedPlan) setSelectedPlan({ ...selectedPlan, [field]: value });
    };

    const updatePackageField = (field: keyof ServicePackage, value: any) => {
        if (selectedPackage) setSelectedPackage({ ...selectedPackage, [field]: value });
    };

    const handleFeatureChange = (isPackage: boolean, index: number, value: string) => {
        if (isPackage && selectedPackage) {
            const newFeatures = [...selectedPackage.features];
            newFeatures[index] = value;
            setSelectedPackage({ ...selectedPackage, features: newFeatures });
        } else if (!isPackage && selectedPlan) {
            const newFeatures = [...selectedPlan.features];
            newFeatures[index] = value;
            setSelectedPlan({ ...selectedPlan, features: newFeatures });
        }
    };

    const addFeatureField = (isPackage: boolean) => {
        if (isPackage && selectedPackage) {
            setSelectedPackage({ ...selectedPackage, features: [...selectedPackage.features, ''] });
        } else if (!isPackage && selectedPlan) {
            setSelectedPlan({ ...selectedPlan, features: [...selectedPlan.features, ''] });
        }
    };

    const removeFeatureField = (isPackage: boolean, index: number) => {
        if (isPackage && selectedPackage) {
            const newFeatures = selectedPackage.features.filter((_, i) => i !== index);
            setSelectedPackage({ ...selectedPackage, features: newFeatures });
        } else if (!isPackage && selectedPlan) {
            const newFeatures = selectedPlan.features.filter((_, i) => i !== index);
            setSelectedPlan({ ...selectedPlan, features: newFeatures });
        }
    };

    const getPlanName = (id: string) => plans.find(p => p.id === id)?.name || 'Plano';

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            const amount = parseFloat(withdrawForm.amount);
            if (isNaN(amount) || amount < 50) {
                alert('Valor mínimo para saque é R$ 50,00');
                return;
            }
            if (amount > balanceData.balance) {
                alert('Saldo insuficiente');
                return;
            }

            await subscriptionService.requestPayout(currentUser.tenantId, {
                amount,
                pixKey: withdrawForm.pixKey,
                pixKeyType: withdrawForm.pixKeyType,
                notes: withdrawForm.notes
            });

            alert('Solicitação de saque enviada com sucesso! Você receberá o valor em breve.');
            setIsWithdrawModalOpen(false);
            loadData(); // Refresh balance
        } catch (err) {
            console.error('Error requesting payout:', err);
            alert('Erro ao processar saque');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-primary-500" size={40} />
                <p className="text-gray-400">Carregando sistema de assinaturas...</p>
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Planos e Pacotes</h1>
                    <p className="text-gray-400">Configure assinaturas recorrentes e combos de serviços.</p>
                </div>

                {/* New Button dinâmico */}
                {activeTab === 'plans' ? (
                    <button
                        onClick={handleNewPlan}
                        className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-primary-500/20"
                    >
                        <Plus size={20} /> Novo Plano
                    </button>
                ) : (
                    <button
                        onClick={handleNewPackage}
                        className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-primary-500/20"
                    >
                        <Plus size={20} /> Novo Pacote
                    </button>
                )}
            </div>

            {/* Tabs Switcher */}
            <div className="flex space-x-1 bg-dark-900 p-1 rounded-xl border border-gray-800 w-fit">
                <button
                    onClick={() => setActiveTab('plans')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'plans'
                        ? 'bg-primary-500 text-dark-950 shadow'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Crown size={16} /> Assinaturas (Recorrente)
                </button>
                <button
                    onClick={() => setActiveTab('packages')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'packages'
                        ? 'bg-primary-500 text-dark-950 shadow'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Package size={16} /> Pacotes (Avulso)
                </button>
                <button
                    onClick={() => setActiveTab('wallet')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'wallet'
                        ? 'bg-primary-500 text-dark-950 shadow'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Wallet size={16} /> Minha Carteira
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'settings'
                        ? 'bg-primary-500 text-dark-950 shadow'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Settings size={16} /> Dados de Saque
                </button>
            </div>

            {/* ======================= ABA: PLANOS ======================= */}
            {activeTab === 'plans' && (
                <div className="space-y-6 animate-in fade-in">

                    {/* Hero de Assinaturas */}
                    <div className="bg-gradient-to-r from-primary-950 to-dark-900 rounded-xl border border-primary-500/20 p-6 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-24 bg-primary-500/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>

                        <div className="flex flex-col md:flex-row justify-between items-center relative z-10 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary-500/20 rounded-xl border border-primary-500/30 text-primary-500">
                                    <Crown size={32} />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm font-medium mb-1">Receita Mensal Recorrente</p>
                                    <h2 className="text-4xl font-bold text-white">R$ {mrr.toFixed(2)}</h2>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => setActiveTab('wallet')}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-dark-950 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-lg"
                                >
                                    <Wallet size={20} /> Ver Minha Carteira
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Conselheiro de Preço (Apenas para Planos) */}
                    <div className="bg-dark-900 rounded-xl border border-gray-800 p-6 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="p-2 bg-gray-800 rounded-lg text-primary-500">
                                <Lightbulb size={24} fill="currentColor" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Conselheiro de Precificação</h2>
                                <p className="text-sm text-gray-400">
                                    Baseado no seu Ticket Médio atual de <span className="text-primary-500 font-bold">R$ {ticketMetrics.avgTicket.toFixed(2)}</span>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                            {ticketMetrics.suggestions.map((sug, idx) => {
                                const calculatedPrice = ticketMetrics.avgTicket * sug.multiplier;
                                return (
                                    <div key={idx} className={`bg-gray-800/50 border rounded-xl p-4 flex flex-col ${sug.recommended ? 'border-primary-500 shadow-lg shadow-primary-500/10 ring-1 ring-primary-500/30' : 'border-gray-700'}`}>
                                        {sug.recommended && (
                                            <div className="self-start bg-primary-500 text-dark-950 text-[10px] uppercase font-bold px-2 py-0.5 rounded mb-2 flex items-center gap-1">
                                                <Target size={10} /> Recomendado
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-white font-bold">{sug.label}</h3>
                                            <span className="text-xs text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">{sug.multiplier}x Ticket</span>
                                        </div>
                                        <p className="text-3xl font-bold text-white mb-2">R$ {calculatedPrice.toFixed(0)}<span className="text-sm text-gray-500 font-normal">,00</span></p>
                                        <p className="text-xs text-gray-400 mb-4 flex-1">{sug.desc}</p>
                                        <button
                                            onClick={() => handleUseSuggestion(calculatedPrice, sug.suggestedName)}
                                            className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${sug.recommended ? 'bg-primary-500 text-dark-950 hover:bg-primary-600' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                                        >
                                            Usar Preço <ArrowRight size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-dark-900 p-5 rounded-xl border border-gray-800 flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium">Assinantes Ativos</p>
                                <p className="text-2xl font-bold text-white mt-1">{subscribers.length}</p>
                            </div>
                            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500">
                                <Users size={24} />
                            </div>
                        </div>
                        <div className="bg-dark-900 p-5 rounded-xl border border-gray-800 flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium">Receita Recorrente (MRR)</p>
                                <p className="text-2xl font-bold text-primary-500 mt-1">R$ {mrr.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-primary-500/10 rounded-lg text-primary-500">
                                <TrendingUp size={24} />
                            </div>
                        </div>
                        <div className="bg-dark-900 p-5 rounded-xl border border-gray-800 flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium">Planos Ativos</p>
                                <p className="text-2xl font-bold text-white mt-1">{plans.length}</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                                <ShieldCheck size={24} />
                            </div>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-white">Nossos Planos</h2>

                    {/* Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div key={plan.id} className="bg-dark-900 rounded-xl border border-gray-800 flex flex-col hover:border-primary-500/30 transition-all relative group">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setSelectedPlan(plan)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                <div className="p-6 border-b border-gray-800">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                        {plan.gateway_plan_id ? (
                                            <span className="bg-green-500/10 text-green-500 text-[10px] px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase flex items-center gap-1">
                                                <ShieldCheck size={10} /> Sincronizado
                                            </span>
                                        ) : (
                                            <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase flex items-center gap-1">
                                                <Clock size={10} /> Não Sincronizado
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-primary-500">R$ {plan.price.toFixed(2)}</span>
                                        <span className="text-sm text-gray-500">/{plan.frequency === 'monthly' ? 'mês' : 'ano'}</span>
                                    </div>
                                </div>
                                <div className="p-6 flex-1">
                                    <ul className="space-y-3">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                                                <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="p-6 bg-gray-900/50 rounded-b-xl border-t border-gray-800">
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Users size={16} />
                                        <span>
                                            {subscribers.filter(s => s.subscriptionPlanId === plan.id).length} assinantes
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h2 className="text-xl font-bold text-white pt-4">Assinantes Recentes</h2>
                    <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
                        <table className="w-full text-left text-gray-400">
                            <thead className="bg-gray-900/50 text-xs uppercase font-semibold text-gray-500">
                                <tr>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Plano Atual</th>
                                    <th className="px-6 py-4">Renovação</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {subscribers.map(sub => (
                                    <tr key={sub.id} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={sub.avatar} alt={sub.name} className="w-8 h-8 rounded-full bg-gray-800" />
                                                <span className="text-white font-medium">{sub.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-md bg-gray-800 border border-gray-700 text-xs font-bold text-white">
                                                {getPlanName(sub.subscriptionPlanId!)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {new Date(sub.subscriptionRenewsAt!).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                                                <Check size={10} /> Ativo
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-gray-500 hover:text-white"><MoreHorizontal size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================= ABA: CARTEIRA ======================= */}
            {activeTab === 'wallet' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Sumário de Saldo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-green-950 to-dark-900 rounded-xl border border-green-500/20 p-6 flex flex-col">
                            <p className="text-green-400 text-sm font-medium mb-1">Saldo Disponível</p>
                            <h2 className="text-4xl font-bold text-white mb-4">R$ {balanceData.balance.toFixed(2)}</h2>
                            <button
                                onClick={() => setIsWithdrawModalOpen(true)}
                                disabled={balanceData.balance < 50}
                                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                            >
                                <ArrowUpRight size={18} /> Solicitar Saque
                            </button>
                            <p className="text-[10px] text-gray-500 mt-2 text-center italic">Mínimo para saque: R$ 50,00</p>
                        </div>

                        <div className="bg-dark-900 p-6 rounded-xl border border-gray-800 flex flex-col justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">Total Já Recebido</p>
                                <h2 className="text-2xl font-bold text-white">R$ {balanceData.withdrawn_total.toFixed(2)}</h2>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                                <span className="text-xs text-gray-500">Histórico Total</span>
                                <TrendingUp size={16} className="text-primary-500" />
                            </div>
                        </div>

                        <div className="bg-dark-900 p-6 rounded-xl border border-gray-800 flex flex-col justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">Saques Pendentes</p>
                                <h2 className="text-2xl font-bold text-white">R$ {balanceData.pending_payout.toFixed(2)}</h2>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                                <span className="text-xs text-gray-500 text-yellow-500">Em processamento</span>
                                <Clock size={16} className="text-yellow-500" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Histórico de Transações */}
                        <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden h-fit">
                            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                                <h3 className="text-white font-bold">Últimas Transações</h3>
                                <Landmark size={18} className="text-gray-600" />
                            </div>
                            <div className="p-0 overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-gray-500 uppercase font-bold bg-gray-900/30">
                                        <tr>
                                            <th className="px-4 py-3">Data</th>
                                            <th className="px-4 py-3">Descrição</th>
                                            <th className="px-4 py-3 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">Nenhuma transação registrada.</td>
                                            </tr>
                                        ) : (
                                            transactions.map(tx => (
                                                <tr key={tx.id} className="hover:bg-gray-800/30 transition-colors">
                                                    <td className="px-4 py-3 text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-medium">{tx.description}</span>
                                                            <span className="text-[10px] text-gray-500">REF: {tx.reference_id}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-bold ${tx.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                                                        {tx.type === 'credit' ? '+' : '-'} R$ {Math.abs(tx.amount).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Solicitações de Saque */}
                        <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden h-fit">
                            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                                <h3 className="text-white font-bold">Histórico de Saques</h3>
                                <ArrowUpRight size={18} className="text-gray-600" />
                            </div>
                            <div className="p-0">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-gray-500 uppercase font-bold bg-gray-900/30">
                                        <tr>
                                            <th className="px-4 py-3">Data</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {payoutRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">Nenhuma solicitação de saque.</td>
                                            </tr>
                                        ) : (
                                            payoutRequests.map(req => (
                                                <tr key={req.id} className="hover:bg-gray-800/30 transition-colors">
                                                    <td className="px-4 py-3 text-gray-400">{new Date(req.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${req.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                                                            req.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                                                'bg-yellow-500/10 text-yellow-500'
                                                            }`}>
                                                            {req.status === 'pending' ? 'Pendente' :
                                                                req.status === 'approved' ? 'Aprovado' :
                                                                    req.status === 'paid' ? 'Pago' : 'Recusado'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-white font-medium">
                                                        R$ {req.amount.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================= ABA: CONFIGURAÇÕES DE SAQUE ======================= */}
            {activeTab === 'settings' && (
                <div className="space-y-6 animate-in fade-in max-w-2xl">
                    <div className="bg-dark-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center gap-3">
                            <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
                                <Landmark size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Dados de Recebimento (PIX)</h3>
                                <p className="text-xs text-gray-500">Onde você receberá os lucros líquidos das suas assinaturas.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveGateway} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5 flex items-center gap-2">
                                        Tipo de Chave
                                    </label>
                                    <select
                                        value={withdrawForm.pixKeyType}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, pixKeyType: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                                    >
                                        <option value="cpf">CPF</option>
                                        <option value="cnpj">CNPJ</option>
                                        <option value="email">E-mail</option>
                                        <option value="phone">Telefone</option>
                                        <option value="random">Chave Aleatória</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5 flex items-center gap-2">
                                        Chave PIX
                                    </label>
                                    <input
                                        type="text"
                                        value={withdrawForm.pixKey}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, pixKey: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                                        placeholder="Digite sua chave aqui"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Atenção</h4>
                                <ul className="text-[11px] text-gray-400 space-y-2 list-disc pl-4">
                                    <li>Os saques são processados em até 48h úteis após a solicitação.</li>
                                    <li>Certifique-se de que a chave PIX está correta e vinculada ao titular da barbearia.</li>
                                    <li>Taxa de intermediação da plataforma (5%) já descontada automaticamente em cada transação.</li>
                                </ul>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-all shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Salvar Dados de Saque
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {activeTab === 'packages' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-gray-800/30 border border-gray-800 p-6 rounded-xl flex items-start gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                            <Tag size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Estratégia de Pacotes</h3>
                            <p className="text-gray-400 text-sm mt-1">
                                Pacotes são ótimos para gerar caixa imediato (Cashflow) e fidelizar clientes que não querem o compromisso da assinatura.
                                Crie combos de serviços ou pacotes de volume (ex: 5 cortes pelo preço de 4).
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {packages.map((pkg) => (
                            <div key={pkg.id} className="bg-dark-900 rounded-xl border border-gray-800 flex flex-col hover:border-blue-500/30 transition-all relative group">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onClick={() => setSelectedPackage(pkg)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                <div className="p-6 border-b border-gray-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded border border-blue-500/20">Pacote Avulso</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-white">R$ {pkg.price.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="p-6 flex-1">
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3 text-sm text-gray-300">
                                            <Clock size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                            <span>Validade: <strong className="text-white">{pkg.validityDays} dias</strong></span>
                                        </li>
                                        {pkg.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                                                <Check size={16} className="text-gray-500 mt-0.5 shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="p-6 bg-gray-900/50 rounded-b-xl border-t border-gray-800">
                                    <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors">
                                        Vender Pacote
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Criar/Editar PLANO */}
            {selectedPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-800">
                            <h2 className="text-xl font-bold text-white">
                                {plans.some(p => p.id === selectedPlan.id) ? 'Editar Plano' : 'Novo Plano'}
                            </h2>
                            <button onClick={() => setSelectedPlan(null)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nome do Plano</label>
                                <input
                                    type="text"
                                    value={selectedPlan.name}
                                    onChange={(e) => updatePlanField('name', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    placeholder="Ex: Clube do Corte"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Preço (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={selectedPlan.price}
                                        onChange={(e) => updatePlanField('price', parseFloat(e.target.value))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Ciclo</label>
                                    <select
                                        value={selectedPlan.frequency}
                                        onChange={(e) => updatePlanField('frequency', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    >
                                        <option value="monthly">Mensal</option>
                                        <option value="quarterly">Trimestral</option>
                                        <option value="yearly">Anual</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Benefícios Inclusos</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {selectedPlan.features.map((feature, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={feature}
                                                onChange={(e) => handleFeatureChange(false, index, e.target.value)}
                                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-primary-500"
                                                placeholder="Ex: Cortes Ilimitados"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeFeatureField(false, index)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => addFeatureField(false)}
                                    className="mt-2 text-sm text-primary-500 hover:text-primary-400 font-medium flex items-center gap-1"
                                >
                                    <Plus size={16} /> Adicionar Benefício
                                </button>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPlan(null)}
                                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors"
                                >
                                    <Save size={20} />
                                    Salvar Plano
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Criar/Editar PACOTE */}
            {selectedPackage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-800">
                            <h2 className="text-xl font-bold text-white">
                                {packages.some(p => p.id === selectedPackage.id) ? 'Editar Pacote' : 'Novo Pacote'}
                            </h2>
                            <button onClick={() => setSelectedPackage(null)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePackage} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nome do Pacote</label>
                                <input
                                    type="text"
                                    value={selectedPackage.name}
                                    onChange={(e) => updatePackageField('name', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    placeholder="Ex: Combo 5 Cortes"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Preço (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={selectedPackage.price}
                                        onChange={(e) => updatePackageField('price', parseFloat(e.target.value))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Validade (Dias)</label>
                                    <input
                                        type="number"
                                        value={selectedPackage.validityDays}
                                        onChange={(e) => updatePackageField('validityDays', parseInt(e.target.value))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                        placeholder="30"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Itens Inclusos</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {selectedPackage.features.map((feature, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={feature}
                                                onChange={(e) => handleFeatureChange(true, index, e.target.value)}
                                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-primary-500"
                                                placeholder="Ex: 5 Cortes de Cabelo"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeFeatureField(true, index)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => addFeatureField(true)}
                                    className="mt-2 text-sm text-primary-500 hover:text-primary-400 font-medium flex items-center gap-1"
                                >
                                    <Plus size={16} /> Adicionar Item
                                </button>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPackage(null)}
                                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors"
                                >
                                    <Save size={20} />
                                    Salvar Pacote
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Saque */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-800">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Landmark className="text-primary-500" /> Solicitar Saque
                            </h2>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleWithdraw} className="p-6 space-y-4">
                            <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-gray-400">Saldo Disponível</span>
                                    <span className="text-xl font-bold text-white">R$ {balanceData.balance.toFixed(2)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Valor do Saque (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={withdrawForm.amount}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <Key size={12} /> Sua Chave PIX:
                                </p>
                                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                                    <p className="text-xs text-white break-all">
                                        <span className="text-primary-500 font-bold uppercase mr-2">{withdrawForm.pixKeyType}:</span>
                                        {withdrawForm.pixKey || 'Nenhuma chave cadastrada'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsWithdrawModalOpen(false);
                                            setActiveTab('settings');
                                        }}
                                        className="text-[10px] text-primary-500 hover:underline mt-2"
                                    >
                                        Alterar chave PIX
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setIsWithdrawModalOpen(false)}
                                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-900/20"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SubscriptionsPage;
