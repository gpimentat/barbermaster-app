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

    useEffect(() => {
        loadPlans();
    }, [tenant.id]);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const data = await clientService.getSubscriptionPlans(tenant.id);
            setPlans(data);
        } catch (err) {
            console.error('Error loading plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (planId: string) => {
        try {
            setSubscribingId(planId);
            const response = await clientService.subscribeToPlan(tenant.id, clientData.id, planId);

            // Redirecionar para o Checkout do Mercado Pago
            if (response.init_point) {
                window.location.href = response.init_point;
            } else {
                alert('Erro ao gerar checkout. Tente novamente.');
            }
        } catch (err) {
            console.error('Error initiating subscription:', err);
            alert('Não foi possível iniciar a assinatura. Verifique sua conexão.');
        } finally {
            setSubscribingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
                <Loader2 className="animate-spin text-primary-500 mb-4" size={40} />
                <p className="text-gray-400">Carregando planos exclusivos...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white pb-24">
            {/* Header */}
            <div className="p-6 flex items-center gap-4 border-b border-gray-900 bg-gray-950/50 backdrop-blur-md sticky top-0 z-50">
                <button
                    onClick={() => navigate('/profile')}
                    className="p-2 hover:bg-gray-900 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-xl font-bold">Assinaturas VIP</h1>
                    <p className="text-xs text-gray-500">Escolha o plano ideal para você</p>
                </div>
            </div>

            <div className="p-6 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                {/* Hero / Intro */}
                <div className="bg-gradient-to-br from-primary-950/50 to-dark-900 rounded-3xl p-8 border border-primary-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-20 bg-primary-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="p-4 bg-primary-500/20 rounded-2xl mb-4">
                            <Crown className="text-primary-500" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Seja Membro VIP</h2>
                        <p className="text-gray-400 text-sm max-w-xs">
                            Economize no mês, garanta sua agenda preferencial e aproveite benefícios exclusivos em cada visita.
                        </p>
                    </div>
                </div>

                {/* Plans List */}
                <div className="space-y-6">
                    {plans.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Nenhum plano disponível no momento.</p>
                        </div>
                    ) : (
                        plans.map((plan) => (
                            <div
                                key={plan.id}
                                className="bg-dark-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-primary-500/30 transition-all flex flex-col"
                            >
                                <div className="p-6 border-b border-gray-800 bg-gray-900/30">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                                        {plan.name.toLowerCase().includes('vip') && (
                                            <span className="bg-primary-500 text-dark-950 text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                                <Zap size={10} /> Popular
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-primary-500">R$ {plan.price.toFixed(2)}</span>
                                        <span className="text-sm text-gray-500">/{plan.frequency === 'monthly' ? 'mês' : 'ano'}</span>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4 flex-1">
                                    <ul className="space-y-3">
                                        {plan.features.map((feature: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                                                <div className="mt-1 p-0.5 bg-green-500/10 rounded-full">
                                                    <Check size={12} className="text-green-500" />
                                                </div>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-6 pt-0">
                                    <button
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={subscribingId !== null}
                                        className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-800 disabled:text-gray-500 text-dark-950 font-bold rounded-xl transition-all shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2"
                                    >
                                        {subscribingId === plan.id ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : (
                                            <>
                                                <CreditCard size={20} />
                                                Assinar Agora
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[10px] text-gray-500 text-center mt-3 flex items-center justify-center gap-1">
                                        <ShieldCheck size={12} /> Pagamento 100% seguro via Mercado Pago
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* FAQ / Info Section */}
                <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                        <Zap size={18} className="text-primary-500" /> Como funciona?
                    </h4>
                    <div className="space-y-4 text-xs text-gray-400">
                        <p>1. Escolha o plano que melhor se adapta à sua frequência.</p>
                        <p>2. Complete o pagamento seguro via cartão ou PIX recorrente.</p>
                        <p>3. Seus benefícios são liberados instantaneamente no app!</p>
                        <p>4. Você pode cancelar a renovação a qualquer momento pelo seu perfil.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientSubscriptionPlans;
