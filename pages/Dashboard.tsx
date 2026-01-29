
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  CalendarCheck,
  Wallet,
  TrendingUp,
  Crown,
  Percent,
  Scissors,
  Clock,
  User,
  Plus,
  Loader2,
  Package
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import StatsCard from '../components/StatsCard';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';
import { dashboardService, DashboardStats } from '../src/services/dashboardService';

const Dashboard: React.FC = () => {
  const { role, currentUser, updateBarber } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [barberStats, setBarberStats] = useState<any>(null);
  const [activeTabBarber, setActiveTabBarber] = useState<'summary' | 'goals'>('summary');
  const [newGoal, setNewGoal] = useState<string>('');

  useEffect(() => {
    if (currentUser?.tenantId) {
      loadData();
    }
  }, [currentUser, role]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (role === 'barber') {
        const data = await dashboardService.getBarberStats(currentUser!.tenantId, currentUser!.id);
        setBarberStats(data);
      } else {
        const data = await dashboardService.getAdminStats(currentUser!.tenantId);
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 animate-in fade-in">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
        <p className="text-gray-400 font-medium font-inter">Carregando painel de controle...</p>
      </div>
    );
  }

  // --- RENDERIZAÇÃO: VISÃO DO BARBEIRO ---
  if (role === 'barber' && currentUser && barberStats) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Olá, {currentUser.name} 👋</h1>
            <p className="text-gray-400">Aqui está o resumo da sua produção hoje.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-primary-500/10 text-primary-500 px-4 py-2 rounded-lg border border-primary-500/20 font-bold text-sm">
              Taxa de Comissão: {currentUser.commissionRate}%
            </div>
          </div>
        </div>

        {/* Tabs para Barbeiro */}
        <div className="flex border-b border-gray-800 gap-8">
          <button
            onClick={() => setActiveTabBarber('summary')}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTabBarber === 'summary' ? 'text-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Resumo de Hoje
            {activeTabBarber === 'summary' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 animate-in fade-in slide-in-from-left-2" />}
          </button>
          <button
            onClick={() => setActiveTabBarber('goals')}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTabBarber === 'goals' ? 'text-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Minhas Metas Semanais
            {activeTabBarber === 'goals' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 animate-in fade-in slide-in-from-left-2" />}
          </button>
        </div>

        {activeTabBarber === 'summary' ? (
          <>
            {/* KPI Grid Pessoal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Minha Produção Total"
                value={`R$ ${barberStats.totalProduction.toFixed(2)}`}
                positive={true}
                icon={Scissors}
                color="text-white"
              />
              <StatsCard
                title="Minha Comissão (Est.)"
                value={`R$ ${(barberStats.totalProduction * (currentUser.commissionRate / 100)).toFixed(2)}`}
                change="Disponível em breve"
                positive={true}
                icon={Wallet}
                color="text-green-500"
              />
              <StatsCard
                title="Meus Atendimentos"
                value={barberStats.appointmentsCount}
                change={`${barberStats.upcomingAppointments.length} pendentes`}
                positive={true}
                icon={CalendarCheck}
                color="text-blue-500"
              />
            </div>

            {/* Agenda Rápida do Barbeiro */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Clock size={20} className="text-primary-500" /> Meus Atendimentos Hoje
                  </h3>
                </div>
                <div className="divide-y divide-gray-800">
                  {barberStats.todayAppointments.length > 0 ? (
                    barberStats.todayAppointments.map((appt: any, idx: number) => {
                      return (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center justify-center bg-gray-800 w-12 h-12 rounded-lg border border-gray-700">
                              <span className="text-white font-bold">{appt.start_time}</span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{appt.clients?.name || 'Cliente'}</p>
                              <p className="text-xs text-gray-500">{appt.services?.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-bold px-2 py-1 rounded inline-block mb-1 ${appt.status === 'Agendado' ? 'bg-blue-500/10 text-blue-500' :
                              appt.status === 'Confirmado' ? 'bg-green-500/10 text-green-500' :
                                'bg-gray-700 text-gray-400'
                              }`}>{appt.status}</span>
                            <span className="block text-sm font-bold text-gray-300">R$ {Number(appt.price).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      Nenhum agendamento para hoje.
                    </div>
                  )}
                </div>
              </div>

              {/* Card de Meta na aba Resumo */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-800 p-6 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 mb-4">
                  <Crown size={32} />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Meta Semanal</h3>
                <p className="text-gray-400 text-sm mb-6">
                  {currentUser.weeklyGoal && currentUser.weeklyGoal > 0
                    ? `Continue assim! Sua meta é de R$ ${currentUser.weeklyGoal.toFixed(2)}.`
                    : "Defina sua meta semanal na aba 'Minhas Metas' para acompanhar seu progresso."}
                </p>

                {currentUser.weeklyGoal && currentUser.weeklyGoal > 0 && (
                  <>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className="bg-yellow-500 h-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, (barberStats.totalProduction / currentUser.weeklyGoal) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {Math.round((barberStats.totalProduction / currentUser.weeklyGoal) * 100)}% Concluído
                      (R$ {barberStats.totalProduction.toFixed(2)} / R$ {currentUser.weeklyGoal.toFixed(2)})
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6 py-8 animate-in slide-in-from-bottom-4">
            <div className="bg-dark-900 p-8 rounded-xl border border-gray-800 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary-500/10 rounded-xl text-primary-500">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Definir Meta de Faturamento</h2>
                  <p className="text-sm text-gray-400">Quanto você deseja produzir nesta semana?</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Valor da Meta Semanal (R$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                    <input
                      type="number"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      placeholder={currentUser.weeklyGoal?.toString() || "0.00"}
                      className="w-full bg-dark-950 border border-gray-800 rounded-lg pl-12 pr-4 py-4 text-white text-xl font-bold focus:border-primary-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!newGoal) return;
                    updateBarber({ ...currentUser, weeklyGoal: Number(newGoal) });
                    setNewGoal('');
                    setActiveTabBarber('summary');
                  }}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold py-4 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98]"
                >
                  Salvar Meta Semanal
                </button>

                <p className="text-center text-xs text-gray-500 italic mt-4">
                  💡 Dica: Defina metas realistas para se manter motivado durante a semana.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDERIZAÇÃO: VISÃO DA RECEPÇÃO ---
  if (role === 'receptionist' && stats) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Painel da Recepção</h1>
            <p className="text-gray-400">Visão geral operacional e fluxo do dia.</p>
          </div>
          <div className="text-sm bg-gray-800 px-3 py-1 rounded border border-gray-700 text-gray-400">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* Atalhos Operacionais */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Link to="/schedule" className="bg-dark-900 p-6 rounded-xl border border-gray-800 hover:border-primary-500 transition-all group">
            <div className="w-12 h-12 bg-primary-500/10 rounded-lg flex items-center justify-center text-primary-500 mb-4 group-hover:scale-110 transition-transform">
              <CalendarCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Agenda</h3>
            <p className="text-gray-400 text-xs">Agendamentos.</p>
          </Link>

          <Link to="/comandas" className="bg-dark-900 p-6 rounded-xl border border-gray-800 hover:border-green-500 transition-all group">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
              <Scissors size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Comandas</h3>
            <p className="text-gray-400 text-xs">Abrir/Fechar.</p>
          </Link>

          <Link to="/clients" className="bg-dark-900 p-6 rounded-xl border border-gray-800 hover:border-purple-500 transition-all group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Clientes</h3>
            <p className="text-gray-400 text-xs">Cadastros.</p>
          </Link>

          <Link to="/subscriptions" className="bg-dark-900 p-6 rounded-xl border border-gray-800 hover:border-yellow-500 transition-all group">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-500 mb-4 group-hover:scale-110 transition-transform">
              <Crown size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Assinaturas</h3>
            <p className="text-gray-400 text-xs">Vender Planos.</p>
          </Link>

          <Link to="/products" className="bg-dark-900 p-6 rounded-xl border border-gray-800 hover:border-pink-500 transition-all group">
            <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center text-pink-500 mb-4 group-hover:scale-110 transition-transform">
              <Package size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Pacotes</h3>
            <p className="text-gray-400 text-xs">Vender Pacotes.</p>
          </Link>
        </div>

        {/* Próximos Agendamentos */}
        <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock size={20} className="text-primary-500" /> Próximos Agendamentos (Hoje)
            </h3>
            <Link to="/schedule" className="text-sm text-primary-500 hover:underline">Ver Agenda Completa</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {stats.todayAppointments.length > 0 ? (
              stats.todayAppointments.map((appt: any, idx: number) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center bg-gray-800 w-14 h-14 rounded-lg border border-gray-700 text-primary-500">
                      <span className="font-bold text-lg">{appt.start_time}</span>
                    </div>
                    <div>
                      <p className="text-white font-bold">{appt.clients?.name || 'Cliente'}</p>
                      <p className="text-sm text-gray-400">{appt.services?.name}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <User size={12} /> Profissional: <span className="text-gray-300">{appt.profiles?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${appt.status === 'Confirmado' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                      appt.status === 'Agendado' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                Sem agendamentos pendentes para hoje.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO: VISÃO DO ADMINISTRADOR ---
  if (stats) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Dashboard Admin</h1>
          <p className="text-gray-400">Visão geral da Barbearia</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Receita de Hoje"
            value={`R$ ${stats.totalRevenue.toFixed(2)}`}
            change="Baseado em comandas pagas"
            positive={true}
            icon={Wallet}
          />
          <StatsCard
            title="Agendamentos"
            value={stats.totalAppointments}
            change="Hoje"
            positive={true}
            icon={CalendarCheck}
            color="text-blue-500"
          />
          <StatsCard
            title="Total de Clientes"
            value={stats.newClients}
            change="Base cadastrada"
            positive={true}
            icon={Users}
            color="text-purple-500"
          />
          <StatsCard
            title="Ticket Médio"
            value={`R$ ${stats.ticketMedio.toFixed(2)}`}
            change="Faturamento/Atendimentos"
            positive={true}
            icon={TrendingUp}
            color="text-green-500"
          />
          <StatsCard
            title="MRR (Assinaturas)"
            value={`R$ ${stats.mrr.toFixed(2)}`}
            change="Plano VIP"
            positive={true}
            icon={Crown}
            color="text-yellow-500"
          />
          <StatsCard
            title="Comissões (Est.)"
            value={`R$ ${stats.commissions.toFixed(2)}`}
            positive={true}
            icon={Percent}
            color="text-pink-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-dark-900 p-6 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 size={20} className="text-primary-500" />
                Faturamento nos Últimos 7 Dias
              </h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.weeklyRevenue}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#eab308' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#eab308"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-dark-900 p-6 rounded-xl border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Ações do Administrador</h3>
            <div className="space-y-4">
              <Link to="/comandas" className="block w-full text-center py-3 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors">
                Gerenciar Comandas
              </Link>
              <Link to="/financial" className="block w-full text-center py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors">
                Ver Fluxo de Caixa
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Dashboard;
