
import React, { useState, useMemo } from 'react';
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
  Percent
} from 'lucide-react';
import { MOCK_BARBERS, MOCK_COMANDAS, MOCK_TRANSACTIONS, MOCK_CLIENTS, MOCK_SUBSCRIPTION_PLANS, MOCK_SERVICES } from '../constants';
import { Barber, Transaction, PaymentMethod } from '../types';

// Interface para estatísticas de comissão padrão
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

// Interface para estatísticas de fichas (Assinaturas)
interface BarberChipStats extends Barber {
    totalChips: number;
    sharePercentage: number;
    payoutValue: number;
    serviceCount: number;
}

const CommissionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'standard' | 'chips'>('standard');
  const [selectedBarber, setSelectedBarber] = useState<BarberStandardStats | null>(null);
  
  // Configuração do Rateio de Assinatura (Simulando persistência local)
  const [mrrAllocationPercentage, setMrrAllocationPercentage] = useState(40);

  // --- LÓGICA 1: COMISSÃO PADRÃO (Para serviços avulsos / não assinantes) ---
  const standardStats = useMemo(() => {
    // Filtra comandas pagas
    const paidComandas = MOCK_COMANDAS.filter(c => c.status === 'paid');

    return MOCK_BARBERS.map(barber => {
        // Encontra itens de serviço feitos por este barbeiro
        // Regra simplificada: Considera TODOS os serviços pagos aqui para a aba "Padrão"
        // (Em um sistema real, filtraríamos fora os serviços cobertos por assinatura se não quisessemos pagar comissão dupla)
        // Para este exemplo, assumimos que a aba Padrão mostra a visão tradicional.
        const barberServices = paidComandas.flatMap(comanda => {
            // Verifica se o cliente é assinante ativo (para excluí-lo da comissão padrão, se desejado)
            // Lógica: Se o cliente é assinante, ele entra no modelo de Fichas, não aqui.
            const client = MOCK_CLIENTS.find(c => c.id === comanda.clientId);
            if (client?.subscriptionStatus === 'active') return []; // Pula assinantes

            return comanda.items
                .filter(item => item.type === 'service' && item.barberId === barber.id)
                .map(item => ({
                    date: comanda.closeDate || comanda.openDate,
                    clientName: comanda.clientName,
                    serviceName: item.name,
                    price: item.price * item.quantity,
                    commission: (item.price * item.quantity) * (barber.commissionRate / 100)
                }));
        });

        const totalGenerated = barberServices.reduce((acc, s) => acc + s.price, 0);
        const commissionValue = barberServices.reduce((acc, s) => acc + s.commission, 0);
        const serviceCount = barberServices.length;
        const averageTicket = serviceCount > 0 ? totalGenerated / serviceCount : 0;

        return {
            ...barber,
            totalGenerated,
            serviceCount,
            averageTicket,
            commissionValue,
            servicesList: barberServices
        };
    }).sort((a, b) => b.commissionValue - a.commissionValue);
  }, []);

  // --- LÓGICA 2: RATEIO DE FICHAS (Para serviços de assinantes) ---
  const chipStatsData = useMemo(() => {
    // 1. Calcular MRR Total
    const activeSubscribers = MOCK_CLIENTS.filter(c => c.subscriptionStatus === 'active');
    const totalMRR = activeSubscribers.reduce((acc, client) => {
        const plan = MOCK_SUBSCRIPTION_PLANS.find(p => p.id === client.subscriptionPlanId);
        return acc + (plan?.price || 0);
    }, 0);

    // 2. Calcular o "Pote" de distribuição
    const distributionPot = totalMRR * (mrrAllocationPercentage / 100);

    // 3. Contar as fichas geradas por cada barbeiro
    const paidComandas = MOCK_COMANDAS.filter(c => c.status === 'paid');
    
    // Calcula o total geral de fichas primeiro
    let globalTotalChips = 0;
    const barberChipData = MOCK_BARBERS.map(barber => {
        let barberChips = 0;
        let servicesCount = 0;

        paidComandas.forEach(comanda => {
            const client = MOCK_CLIENTS.find(c => c.id === comanda.clientId);
            // Só conta fichas se o cliente for assinante
            if (client?.subscriptionStatus === 'active') {
                comanda.items.forEach(item => {
                    if (item.type === 'service' && item.barberId === barber.id) {
                        const serviceDef = MOCK_SERVICES.find(s => s.id === item.itemId);
                        const chips = (serviceDef?.chips || 0) * item.quantity;
                        barberChips += chips;
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
            sharePercentage: 0, // Será calculado abaixo
            payoutValue: 0 // Será calculado abaixo
        };
    });

    // 4. Calcular porcentagens e valores finais
    const finalStats = barberChipData.map(b => {
        const share = globalTotalChips > 0 ? b.totalChips / globalTotalChips : 0;
        return {
            ...b,
            sharePercentage: share * 100,
            payoutValue: distributionPot * share
        };
    }).sort((a, b) => b.payoutValue - a.payoutValue);

    return {
        totalMRR,
        distributionPot,
        globalTotalChips,
        stats: finalStats
    };

  }, [mrrAllocationPercentage]); // Recalcula se a % mudar

  // Ações de Pagamento (Mock)
  const handlePayStandardCommission = () => {
    if (!selectedBarber) return;
    if (window.confirm(`Confirma o pagamento de R$ ${selectedBarber.commissionValue.toFixed(2)} para ${selectedBarber.name}?`)) {
        const newTransaction: Transaction = {
            id: `pay-comm-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            description: `Pagamento Comissão (Padrão) - ${selectedBarber.name}`,
            amount: selectedBarber.commissionValue,
            type: 'expense',
            category: 'Comissões',
            method: PaymentMethod.PIX
        };
        MOCK_TRANSACTIONS.unshift(newTransaction);
        alert('Pagamento registrado com sucesso!');
        setSelectedBarber(null);
    }
  };

  const handlePayPoolDistribution = () => {
      alert("No modelo de fichas, o pagamento geralmente é feito em lote ao final do mês para todos os barbeiros. (Simulação apenas)");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white">Comissões & Repasses</h1>
           <p className="text-gray-400">Gerencie pagamentos de serviços avulsos e rateio de assinaturas.</p>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <Filter size={18} />
                Este Mês
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-dark-950 font-bold rounded-lg hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/10">
                <Download size={18} />
                Exportar
            </button>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex space-x-1 bg-dark-900 p-1 rounded-xl border border-gray-800 w-fit">
        <button
          onClick={() => setActiveTab('standard')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'standard' 
              ? 'bg-primary-500 text-dark-950 shadow' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Comissão Direta
        </button>
        <button
          onClick={() => setActiveTab('chips')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'chips' 
              ? 'bg-primary-500 text-dark-950 shadow' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Ticket size={16} /> Rateio Assinaturas (Fichas)
        </button>
      </div>

      {/* --- CONTEÚDO ABA PADRÃO --- */}
      {activeTab === 'standard' && (
        <div className="space-y-6 animate-in fade-in duration-300">
             {/* Cards de Resumo Padrão */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-900 p-6 rounded-xl border border-gray-800 flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-sm font-medium">Faturamento (Avulso)</p>
                    <p className="text-3xl font-bold text-white mt-1">R$ {standardStats.reduce((acc, s) => acc + s.totalGenerated, 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Serviços fora da assinatura</p>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-xl text-blue-500">
                    <TrendingUp size={32} />
                </div>
                </div>
                <div className="bg-dark-900 p-6 rounded-xl border border-gray-800 flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-sm font-medium">Comissões a Pagar</p>
                    <p className="text-3xl font-bold text-primary-500 mt-1">R$ {standardStats.reduce((acc, s) => acc + s.commissionValue, 0).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-primary-500/10 rounded-xl text-primary-500">
                    <DollarSign size={32} />
                </div>
                </div>
            </div>

            {/* Tabela Padrão */}
            <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Briefcase size={20} className="text-primary-500" /> Detalhamento por Profissional (Não Assinantes)
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-400">
                        <thead className="bg-gray-900/50 text-xs uppercase font-semibold text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Profissional</th>
                                <th className="px-6 py-4 text-center">Taxa (%)</th>
                                <th className="px-6 py-4 text-center">Serviços</th>
                                <th className="px-6 py-4 text-right">Gerado</th>
                                <th className="px-6 py-4 text-right">Comissão</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {standardStats.map(barber => (
                                <tr key={barber.id} className="hover:bg-gray-800/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={barber.avatar} alt={barber.name} className="w-10 h-10 rounded-full bg-gray-800 object-cover" />
                                            <div>
                                                <p className="font-bold text-white">{barber.name}</p>
                                                <p className="text-xs text-gray-500">{barber.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs font-bold border border-gray-700">
                                            {barber.commissionRate}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">{barber.serviceCount}</td>
                                    <td className="px-6 py-4 text-right font-medium text-white">R$ {barber.totalGenerated.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-lg font-bold text-primary-500">R$ {barber.commissionValue.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedBarber(barber)}
                                            className="text-xs bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-dark-950 px-3 py-1.5 rounded transition-colors font-bold border border-primary-500/20"
                                        >
                                            Detalhes
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* --- CONTEÚDO ABA FICHAS (RATEIO) --- */}
      {activeTab === 'chips' && (
          <div className="space-y-6 animate-in fade-in duration-300">
              {/* Painel de Configuração do Rateio */}
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-32 bg-primary-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-end gap-6 relative z-10">
                      <div>
                          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                             <Ticket className="text-primary-500" /> Pool de Rateio (Assinaturas)
                          </h2>
                          <p className="text-gray-400 text-sm max-w-xl">
                              O valor total das assinaturas (MRR) é dividido entre os barbeiros com base na quantidade de "Fichas" acumuladas nos serviços prestados aos assinantes.
                          </p>
                          
                          <div className="mt-6 flex items-center gap-4">
                              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">MRR Total</p>
                                  <p className="text-2xl font-bold text-white">R$ {chipStatsData.totalMRR.toFixed(2)}</p>
                              </div>
                              <div className="text-gray-500">
                                  <X size={16} />
                              </div>
                              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex items-center gap-3">
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">% de Repasse</p>
                                    <div className="flex items-center gap-1">
                                        <input 
                                            type="number" 
                                            value={mrrAllocationPercentage}
                                            onChange={(e) => setMrrAllocationPercentage(Number(e.target.value))}
                                            className="w-16 bg-transparent border-b border-primary-500 text-white font-bold text-xl focus:outline-none text-center"
                                        />
                                        <Percent size={16} className="text-primary-500" />
                                    </div>
                                  </div>
                              </div>
                              <div className="text-gray-500">
                                  =
                              </div>
                              <div className="bg-primary-500/10 p-3 rounded-lg border border-primary-500/30">
                                  <p className="text-xs text-primary-500 uppercase font-bold mb-1">Valor do Rateio</p>
                                  <p className="text-2xl font-bold text-primary-500">R$ {chipStatsData.distributionPot.toFixed(2)}</p>
                              </div>
                          </div>
                      </div>

                      <div className="text-right">
                          <p className="text-sm text-gray-400 mb-1">Total de Fichas Geradas</p>
                          <p className="text-4xl font-black text-white">{chipStatsData.globalTotalChips}</p>
                          <p className="text-xs text-gray-500 mt-1">Neste período</p>
                      </div>
                  </div>
              </div>

              {/* Tabela de Rateio */}
              <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users size={20} className="text-primary-500" /> Distribuição por Fichas
                    </h2>
                    <button 
                        onClick={handlePayPoolDistribution}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded transition-colors font-bold flex items-center gap-2"
                    >
                        <DollarSign size={14} /> Processar Repasse em Lote
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-400">
                        <thead className="bg-gray-900/50 text-xs uppercase font-semibold text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Profissional</th>
                                <th className="px-6 py-4 text-center">Serviços (Assinante)</th>
                                <th className="px-6 py-4 text-center">Fichas Acumuladas</th>
                                <th className="px-6 py-4 text-center">Participação (%)</th>
                                <th className="px-6 py-4 text-right">Valor a Receber</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {chipStatsData.stats.map(barber => (
                                <tr key={barber.id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={barber.avatar} alt={barber.name} className="w-10 h-10 rounded-full bg-gray-800 object-cover" />
                                            <div>
                                                <p className="font-bold text-white">{barber.name}</p>
                                                <p className="text-xs text-gray-500">{barber.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {barber.serviceCount}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 bg-gray-800 text-white px-3 py-1 rounded-full text-sm font-bold border border-gray-700">
                                            <Ticket size={12} className="text-primary-500" />
                                            {barber.totalChips}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-sm font-bold">{barber.sharePercentage.toFixed(1)}%</span>
                                            <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary-500" 
                                                    style={{ width: `${barber.sharePercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xl font-bold text-green-500">
                                            R$ {barber.payoutValue.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {chipStatsData.stats.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-500">
                                        Nenhum serviço realizado para assinantes neste período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
              </div>
          </div>
      )}

      {/* MODAL DE DETALHES (Apenas para Comissão Padrão por enquanto) */}
      {selectedBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              
              <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-4">
                    <img src={selectedBarber.avatar} className="w-12 h-12 rounded-full border border-gray-700 object-cover" />
                    <div>
                        <h2 className="text-xl font-bold text-white">Extrato (Comissão Padrão)</h2>
                        <p className="text-sm text-gray-500">{selectedBarber.name} • {selectedBarber.role}</p>
                    </div>
                </div>
                <button onClick={() => setSelectedBarber(null)} className="text-gray-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-gray-900/20">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Scissors size={14} /> Serviços Avulsos
                 </h3>
                 
                 {selectedBarber.servicesList.length > 0 ? (
                    <div className="space-y-3">
                        {selectedBarber.servicesList.map((service, index) => (
                            <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-900 rounded-lg text-gray-400">
                                        <Calendar size={16} />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium text-sm">{service.serviceName}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><User size={10}/> {service.clientName}</span>
                                            <span>•</span>
                                            <span>{new Date(service.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Cobrado: R$ {service.price.toFixed(2)}</p>
                                    <p className="text-sm font-bold text-green-500">+ R$ {service.commission.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center py-10 text-gray-500 italic border border-dashed border-gray-800 rounded-xl bg-gray-800/20">
                        Nenhum serviço computado para pagamento neste período.
                    </div>
                 )}
              </div>

              <div className="p-6 border-t border-gray-800 bg-gray-900">
                 <div className="flex justify-between items-center mb-6">
                     <div>
                        <span className="block text-gray-400 text-sm font-medium">Total a Pagar</span>
                     </div>
                     <span className="text-3xl font-bold text-primary-500">R$ {selectedBarber.commissionValue.toFixed(2)}</span>
                 </div>
                 
                 <div className="flex gap-3">
                     <button 
                        onClick={() => setSelectedBarber(null)}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors border border-gray-700"
                     >
                        Fechar
                     </button>
                     <button 
                        onClick={handlePayStandardCommission}
                        disabled={selectedBarber.commissionValue <= 0}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                     >
                        <CheckCircle2 size={20} />
                        Registrar Pagamento
                     </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CommissionsPage;
