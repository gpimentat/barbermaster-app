
import React, { useState, useMemo } from 'react';
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
  Landmark
} from 'lucide-react';
import { MOCK_SUBSCRIPTION_PLANS, MOCK_CLIENTS, MOCK_APPOINTMENTS, MOCK_PACKAGES, MOCK_TRANSACTIONS } from '../constants';
import { SubscriptionPlan, ServicePackage, Transaction, PaymentMethod } from '../types';

const SubscriptionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'plans' | 'packages'>('plans');
  
  // State for Plans
  const [plans, setPlans] = useState<SubscriptionPlan[]>(MOCK_SUBSCRIPTION_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  // State for Packages
  const [packages, setPackages] = useState<ServicePackage[]>(MOCK_PACKAGES);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);

  // State for Wallet/Balance
  // Simulando um saldo acumulado (ex: MRR * 2.5 pra parecer que tem acúmulo)
  const [walletBalance, setWalletBalance] = useState<number>(3850.75); 
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  
  // Lista de assinantes e MRR
  const subscribers = MOCK_CLIENTS.filter(c => c.subscriptionStatus === 'active');
  const mrr = subscribers.reduce((acc, sub) => {
    const plan = plans.find(p => p.id === sub.subscriptionPlanId);
    return acc + (plan?.price || 0);
  }, 0);

  // --- LÓGICA DO CONSELHEIRO DE PREÇO (Apenas para Planos) ---
  const ticketMetrics = useMemo(() => {
    const totalRevenue = MOCK_APPOINTMENTS.reduce((acc, curr) => acc + curr.price, 0);
    const totalAppts = MOCK_APPOINTMENTS.length;
    const avgTicket = totalAppts > 0 ? totalRevenue / totalAppts : 0;
    
    return {
        avgTicket,
        suggestions: [
            {
                label: "Entrada (Garantia)",
                multiplier: 1.8,
                desc: "Garante o valor de quase 2 cortes, mesmo que o cliente venha apenas 1 vez.",
                suggestedName: "Básico Mensal"
            },
            {
                label: "Recorrência Ideal",
                multiplier: 3,
                desc: "O ponto ideal. Equivale a 3 visitas. Ótimo para quem corta a cada 15 dias.",
                recommended: true,
                suggestedName: "Estilo Quinzenal"
            },
            {
                label: "VIP / Ilimitado",
                multiplier: 5,
                desc: "Preço premium para acesso livre. Cobre custos e gera alta margem.",
                suggestedName: "Passaporte VIP"
            }
        ]
    };
  }, []);

  // --- HANDLERS PARA PLANOS ---
  const handleNewPlan = () => {
    setSelectedPlan({
      id: Date.now().toString(),
      name: '',
      price: 0,
      frequency: 'monthly',
      features: [''],
      active: true
    });
  };

  const handleUseSuggestion = (price: number, name: string) => {
      setSelectedPlan({
        id: Date.now().toString(),
        name: name,
        price: parseFloat(price.toFixed(2)),
        frequency: 'monthly',
        features: ['Acesso preferencial na agenda', 'Sem custo adicional no balcão'],
        active: true
      });
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    const cleanFeatures = selectedPlan.features.filter(f => f.trim() !== '');
    const planToSave = { ...selectedPlan, features: cleanFeatures };

    if (plans.some(p => p.id === planToSave.id)) {
      setPlans(prev => prev.map(p => p.id === planToSave.id ? planToSave : p));
    } else {
      setPlans(prev => [...prev, planToSave]);
    }
    setSelectedPlan(null);
  };

  const updatePlanField = (field: keyof SubscriptionPlan, value: any) => {
    if (selectedPlan) {
      setSelectedPlan({ ...selectedPlan, [field]: value });
    }
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

  // --- HANDLERS PARA PACOTES ---
  const handleNewPackage = () => {
    setSelectedPackage({
      id: Date.now().toString(),
      name: '',
      price: 0,
      validityDays: 30,
      features: [''],
      active: true
    });
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    const cleanFeatures = selectedPackage.features.filter(f => f.trim() !== '');
    const packageToSave = { ...selectedPackage, features: cleanFeatures };

    if (packages.some(p => p.id === packageToSave.id)) {
      setPackages(prev => prev.map(p => p.id === packageToSave.id ? packageToSave : p));
    } else {
      setPackages(prev => [...prev, packageToSave]);
    }
    setSelectedPackage(null);
  };

  const updatePackageField = (field: keyof ServicePackage, value: any) => {
      if (selectedPackage) {
          setSelectedPackage({ ...selectedPackage, [field]: value });
      }
  };

  const getPlanName = (id: string) => plans.find(p => p.id === id)?.name || 'Plano Removido';

  // --- HANDLER SAQUE ---
  const handleWithdraw = (e: React.FormEvent) => {
      e.preventDefault();
      const amount = parseFloat(withdrawAmount);
      
      if (!amount || amount <= 0) {
          alert("Digite um valor válido.");
          return;
      }
      
      if (amount > walletBalance) {
          alert("Saldo insuficiente.");
          return;
      }

      // Processar Saque
      setWalletBalance(prev => prev - amount);
      
      // Adicionar ao Histórico de Transações (Financeiro)
      const newTransaction: Transaction = {
          id: `wd-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          description: 'Saque de Assinaturas',
          amount: amount,
          type: 'expense', // Saída do caixa da loja/plataforma
          category: 'Retirada',
          method: PaymentMethod.PIX
      };
      MOCK_TRANSACTIONS.unshift(newTransaction);

      alert(`Solicitação de saque de R$ ${amount.toFixed(2)} realizada com sucesso!`);
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
  };

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
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'plans' 
              ? 'bg-primary-500 text-dark-950 shadow' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Crown size={16} /> Assinaturas (Recorrente)
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'packages' 
              ? 'bg-primary-500 text-dark-950 shadow' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Package size={16} /> Pacotes (Avulso)
        </button>
      </div>

      {/* ======================= ABA: PLANOS ======================= */}
      {activeTab === 'plans' && (
        <div className="space-y-6 animate-in fade-in">
            
            {/* NOVO: Painel de Saldo e Saque */}
            <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-xl border border-green-700/50 p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-24 bg-green-500/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-center relative z-10 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30 text-green-400">
                            <Wallet size={32} />
                        </div>
                        <div>
                            <p className="text-green-300 text-sm font-medium mb-1">Saldo Disponível (Assinaturas)</p>
                            <h2 className="text-4xl font-bold text-white">R$ {walletBalance.toFixed(2)}</h2>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button 
                            onClick={() => setIsWithdrawModalOpen(true)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-green-900 px-6 py-3 rounded-lg font-bold hover:bg-green-50 transition-colors shadow-lg"
                        >
                            <ArrowUpRight size={20} /> Solicitar Saque
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
                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
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

      {/* ======================= ABA: PACOTES ======================= */}
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

      {/* Modal de SAQUE */}
      {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                  <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <Landmark className="text-green-500" size={24} /> Solicitar Saque
                      </h2>
                      <button onClick={() => setIsWithdrawModalOpen(false)} className="text-gray-400 hover:text-white">
                          <X size={24} />
                      </button>
                  </div>
                  <form onSubmit={handleWithdraw} className="p-6 space-y-6">
                      <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 text-center">
                          <p className="text-gray-400 text-sm mb-1">Disponível para retirada</p>
                          <p className="text-3xl font-bold text-white">R$ {walletBalance.toFixed(2)}</p>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Valor do Saque</label>
                          <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-500 text-lg">R$</span>
                              <input 
                                  type="number" 
                                  step="0.01" 
                                  max={walletBalance}
                                  value={withdrawAmount}
                                  onChange={(e) => setWithdrawAmount(e.target.value)}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-lg focus:outline-none focus:border-green-500"
                                  placeholder="0.00"
                                  required
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Destino</label>
                          <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500">
                              <option>Chave PIX (CNPJ)</option>
                              <option>Conta Bancária Principal</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-2">O valor será transferido em até 1 dia útil.</p>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              type="button" 
                              onClick={() => setIsWithdrawModalOpen(false)} 
                              className="flex-1 py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-700"
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit" 
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
