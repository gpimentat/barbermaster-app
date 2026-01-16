import React, { useEffect, useState } from 'react';
import { Gift, Star, TrendingUp, Award } from 'lucide-react';
import clientService from '../../src/services/clientService';

interface ClientRewardsProps {
    tenant: any;
    clientData: any;
}

const ClientRewards: React.FC<ClientRewardsProps> = ({ tenant, clientData }) => {
    const [loyaltyPoints, setLoyaltyPoints] = useState(0);
    const [loading, setLoading] = useState(true);

    const appConfig = tenant?.settings?.app_config;
    const rewards = appConfig?.rewards || [];
    const primaryColor = appConfig?.general?.primaryColor || '#eab308';

    useEffect(() => {
        loadLoyaltyPoints();
    }, [clientData]);

    const loadLoyaltyPoints = async () => {
        try {
            if (clientData?.clientId) {
                const client = await clientService.getById(clientData.clientId);
                if (client) {
                    setLoyaltyPoints(client.loyalty_points);
                }
            }
        } catch (error) {
            console.error('Error loading loyalty points:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async (reward: any) => {
        if (reward.pointsCost > loyaltyPoints) {
            alert('Pontos insuficientes!');
            return;
        }

        const confirm = window.confirm(`Resgatar ${reward.title} por ${reward.pointsCost} pontos?`);
        if (!confirm) return;

        try {
            // Deduzir pontos
            await clientService.addLoyaltyPoints(clientData.clientId, -reward.pointsCost);
            setLoyaltyPoints(prev => prev - reward.pointsCost);
            alert('✅ Recompensa resgatada com sucesso!');
        } catch (error) {
            console.error('Redeem error:', error);
            alert('Erro ao resgatar. Tente novamente.');
        }
    };

    const getLevel = () => {
        if (loyaltyPoints >= 500) return { name: 'Platinum', icon: '💎', color: '#E5E4E2' };
        if (loyaltyPoints >= 300) return { name: 'Gold', icon: '🥇', color: '#FFD700' };
        if (loyaltyPoints >= 100) return { name: 'Silver', icon: '🥈', color: '#C0C0C0' };
        return { name: 'Bronze', icon: '🥉', color: '#CD7F32' };
    };

    const level = getLevel();
    const nextLevel = loyaltyPoints >= 500 ? null : loyaltyPoints >= 300 ? 500 : loyaltyPoints >= 100 ? 300 : 100;
    const progress = nextLevel ? (loyaltyPoints / nextLevel) * 100 : 100;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 pb-24">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
                <h1 className="text-xl font-bold text-white">Clube de Recompensas</h1>
                <p className="text-sm text-gray-400 mt-1">Acumule pontos e resgate prêmios</p>
            </div>

            <div className="p-6 space-y-6">
                {/* Card de Pontos */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border shadow-lg" style={{ borderColor: primaryColor }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Seus Pontos</p>
                            <p className="text-white text-4xl font-bold">{loyaltyPoints}</p>
                        </div>
                        <div
                            className="px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1"
                            style={{ backgroundColor: `${level.color}20`, color: level.color }}
                        >
                            <span>{level.icon}</span>
                            <span>{level.name}</span>
                        </div>
                    </div>

                    {nextLevel && (
                        <>
                            <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-full transition-all"
                                    style={{ width: `${progress}%`, backgroundColor: primaryColor }}
                                ></div>
                            </div>
                            <p className="text-gray-500 text-xs">
                                Faltam {nextLevel - loyaltyPoints} pontos para {nextLevel === 500 ? 'Platinum' : nextLevel === 300 ? 'Gold' : 'Silver'}
                            </p>
                        </>
                    )}

                    {!nextLevel && (
                        <p className="text-xs font-bold" style={{ color: primaryColor }}>
                            🎉 Você atingiu o nível máximo!
                        </p>
                    )}
                </div>

                {/* Como Funciona */}
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        <TrendingUp size={18} style={{ color: primaryColor }} />
                        Como Ganhar Pontos
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                                <Star size={16} style={{ color: primaryColor }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-white text-sm font-medium">A cada corte</p>
                                <p className="text-gray-400 text-xs">+10 pontos</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                                <Gift size={16} style={{ color: primaryColor }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-white text-sm font-medium">Indicar amigo</p>
                                <p className="text-gray-400 text-xs">+50 pontos</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                                <Award size={16} style={{ color: primaryColor }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-white text-sm font-medium">Aniversário</p>
                                <p className="text-gray-400 text-xs">+100 pontos</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prêmios Disponíveis */}
                <div>
                    <h3 className="text-white font-bold mb-3">Resgatar Prêmios</h3>
                    <div className="space-y-3">
                        {rewards.length > 0 ? rewards.map((reward: any) => {
                            const canRedeem = reward.pointsCost <= loyaltyPoints;

                            return (
                                <div key={reward.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div
                                            className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${primaryColor}20` }}
                                        >
                                            <Gift size={20} style={{ color: primaryColor }} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm">{reward.title}</p>
                                            <p className="text-gray-500 text-xs">{reward.pointsCost} pontos</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRedeem(reward)}
                                        disabled={!canRedeem}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${canRedeem
                                                ? 'text-dark-950 hover:scale-105'
                                                : 'text-gray-600 border border-gray-800 cursor-not-allowed'
                                            }`}
                                        style={{
                                            backgroundColor: canRedeem ? primaryColor : 'transparent'
                                        }}
                                    >
                                        {canRedeem ? 'Resgatar' : 'Bloqueado'}
                                    </button>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-8">
                                <Award className="mx-auto text-gray-600 mb-2" size={48} />
                                <p className="text-gray-400">Nenhuma recompensa disponível ainda</p>
                                <p className="text-gray-500 text-sm mt-1">Em breve teremos novidades!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientRewards;
