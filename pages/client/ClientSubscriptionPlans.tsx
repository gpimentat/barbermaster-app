import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Crown,
    Check,
    ArrowRight,
    ChevronLeft,
    Loader2,
    ShieldCheck,
    Zap,
    CreditCard
} from 'lucide-react';
import clientService from '../../src/services/clientService';

interface ClientSubscriptionPlansProps {
    tenant: any;
    clientData: any;
}

const ClientSubscriptionPlans: React.FC<ClientSubscriptionPlansProps> = ({ tenant, clientData }) => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [subscribingId, setSubscribingId] = useState<string | null>(null);

    const primaryColor = tenant?.settings?.app_config?.general?.primaryColor || '#eab308';

    useEffect(() => {
        loadPlans();
    }, [tenant.id]);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const data = await clientService.getSubscriptionPlans(tenant.id);
            // Ordenar por preço para melhor exibição
            setPlans(data.sort((a, b) => a.price - b.price));
        } catch (err) {
            console.error('Error loading plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (planId: string) => {
        const clientId = clientData?.id || clientData?.clientId;
        console.log('Subscribing to plan:', { planId, clientId, tenantId: tenant?.id });
        try {
            setSubscribingId(planId);
            if (!clientId) {
                alert('Erro de identificação do cliente. Por favor, saia e entre novamente no app.');
                setSubscribingId(null);
                return;
            }

            const response = await clientService.subscribeToPlan(tenant.id, clientId, planId);

            if (response.success && response.init_point) {
                window.location.href = response.init_point;
            } else {
                console.error('Subscription error response:', response);
                const errorMsg = response.error || response.details || 'Não foi possível iniciar o pagamento. Tente novamente.';
                alert(`Erro ao processar: ${errorMsg}`);
            }
        } catch (err: any) {
            console.error('Error initiating subscription:', err);
            alert(`Erro ao iniciar assinatura: ${err.message || 'Erro de conexão'}`);
        } finally {
            setSubscribingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="animate-spin text-primary-500 mb-4" size={40} style={{ color: primaryColor }} />
                <p className="text-gray-400 font-medium">Preparando experiências exclusivas...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white pb-32">
            {/* Header Moderno */}
            <div className="fixed top-0 left-0 right-0 bg-gray-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 z-50 flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 active:scale-95 transition-all"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-black uppercase tracking-tighter italic">Clube VIP</h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Vantagens Exclusivas</p>
                </div>
            </div>

            <div className="pt-24 px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Hero Branding */}
                <div className="relative rounded-[2.5rem] p-8 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black z-0"></div>
                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[80px] opacity-30 z-0" style={{ backgroundColor: primaryColor }}></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                            <Crown className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" size={32} style={{ color: primaryColor }} />
                        </div>
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4 leading-none">Sua experiência<br /><span style={{ color: primaryColor }}>Elevada ao máximo</span></h2>
                        <p className="text-gray-400 text-xs font-medium leading-relaxed max-w-[240px]">
                            Garanta preços fixos, horários prioritários e mimos que só membros do clube possuem.
                        </p>
                    </div>
                </div>

                {/* Seção de Planos */}
                <div className="grid grid-cols-1 gap-6">
                    {plans.length === 0 ? (
                        <div className="bg-gray-900/50 rounded-3xl p-12 text-center border border-dashed border-gray-800">
                            <Zap className="mx-auto text-gray-700 mb-4" size={40} />
                            <p className="text-gray-500 font-bold text-sm">Novos planos em breve.</p>
                        </div>
                    ) : (
                        plans.map((plan) => (
                            <div
                                key={plan.id}
                                className="relative rounded-[2rem] bg-gray-900/50 border border-gray-800 p-8 flex flex-col transition-all active:scale-[0.98] hover:border-white/10"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black uppercase tracking-tight italic" style={{ color: primaryColor }}>{plan.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black tracking-tighter">R$ {plan.price.toFixed(0)}</span>
                                            <span className="text-xs text-gray-500 font-bold">
                                                /{plan.frequency === 'monthly' ? 'mês' : plan.frequency === 'quarterly' ? 'trimestre' : 'ano'}
                                            </span>
                                        </div>
                                    </div>
                                    <Zap className="text-gray-800" size={24} />
                                </div>

                                <div className="space-y-4 mb-8">
                                    {plan.features?.map((feature: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
                                                <Check size={12} style={{ color: primaryColor }} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-300">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={subscribingId !== null}
                                    className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-dark-950 flex items-center justify-center gap-3 transition-all shadow-xl active:translate-y-1"
                                    style={{
                                        backgroundColor: primaryColor,
                                        boxShadow: `0 10px 20px ${primaryColor}40`
                                    }}
                                >
                                    {subscribingId === plan.id ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            Assinar Plano
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>

                                <div className="mt-4 flex items-center justify-center gap-2 opacity-50">
                                    <ShieldCheck size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Garantia BarberMaster</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer de Segurança */}
                <div className="flex flex-col items-center justify-center text-center space-y-4 pt-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-gray-500">
                            <CreditCard size={20} />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-gray-500">
                            <Zap size={20} />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-gray-500">
                            <ShieldCheck size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed">
                        Pagamento processado de forma segura via Mercado Pago. Cancele quando quiser.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ClientSubscriptionPlans;
