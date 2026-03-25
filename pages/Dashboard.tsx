
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
  Package,
  Briefcase
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
  const [activeModal, setActiveModal] = useState<'production' | 'commission' | 'appointments' | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, role]);

  const loadData = async () => {
    try {
      setLoading(true);
      // SaaS roles do not have a tenant_id, so they shouldn't fetch shop stats
      if (role?.startsWith('saas_')) {
        setLoading(false);
        return;
      }
      
      if (!currentUser?.tenantId) return;

      if (role === 'barber') {
        const data = await dashboardService.getBarberStats(currentUser.tenantId, currentUser.id);
        setBarberStats(data);
      } else {
        const data = await dashboardService.getAdminStats(currentUser.tenantId, currentUser.email);
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
      <div className="space-y-8 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">Olá, {currentUser.name} 👋</h1>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Resumo da sua produtividade de hoje</p>
          </div>
          <div className="flex items-center">
            <div className="bg-primary-500/10 text-primary-500 px-5 py-3 rounded-2xl border border-primary-500/20 font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-500/5">
              Taxa de Comissão: {currentUser.commissionRate}%
            </div>
          </div>
        </div>

        {/* Tabs para Barbeiro - Premium Style */}
        <div className="flex bg-dark-900/50 p-1.5 rounded-[2rem] border border-gray-800/50 shadow-inner">
          <button
            onClick={() => setActiveTabBarber('summary')}
            className={`flex-1 py-4 rounded-[1.5rem] text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${activeTabBarber === 'summary' ? 'bg-primary-500 text-dark-950 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Clock size={16} /> Resumo
          </button>
          <button
            onClick={() => setActiveTabBarber('goals')}
            className={`flex-1 py-4 rounded-[1.5rem] text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${activeTabBarber === 'goals' ? 'bg-primary-500 text-dark-950 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <TrendingUp size={16} /> Metas
          </button>
        </div>

        {activeTabBarber === 'summary' ? (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* KPI Grid Pessoal - Mobile First */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatsCard
                title="Sua Produção"
                value={`R$ ${barberStats.totalProduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                positive={true}
                icon={Scissors}
                color="text-primary-500"
                onClick={() => setActiveModal('production')}
              />
              <StatsCard
                title="Sua Comissão"
                value={`R$ ${(barberStats.totalProduction * (currentUser.commissionRate / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                change="Hoje (Est.)"
                positive={true}
                icon={Wallet}
                color="text-green-500"
                onClick={() => setActiveModal('commission')}
              />
              <StatsCard
                title="Atendimentos"
                value={barberStats.appointmentsCount}
                change={`${barberStats.upcomingAppointments.length} À frente`}
                positive={true}
                icon={CalendarCheck}
                color="text-blue-500"
                onClick={() => setActiveModal('appointments')}
              />
            </div>

            {/* Agenda e Meta */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-dark-900/50 rounded-[2.5rem] border border-gray-800/50 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-gray-800/50 bg-dark-900/40 flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <Clock size={18} className="text-primary-500" /> Fluxo de Hoje
                  </h3>
                  <span className="text-[10px] font-black bg-gray-800/50 text-gray-500 px-3 py-1.5 rounded-full border border-gray-700/30">
                    {barberStats.todayAppointments.length} CLIENTES
                  </span>
                </div>
                <div className="divide-y divide-gray-800/30 max-h-[460px] overflow-y-auto custom-scrollbar">
                  {barberStats.todayAppointments.length > 0 ? (
                    barberStats.todayAppointments.map((appt: any, idx: number) => {
                      return (
                        <div key={idx} className="p-6 flex items-center justify-between hover:bg-primary-500/[0.02] transition-all group">
                          <div className="flex items-center gap-5">
                            <div className="flex flex-col items-center justify-center bg-dark-950 w-14 h-14 rounded-2xl border border-gray-800 group-hover:border-primary-500/30 transition-colors shadow-lg">
                              <span className="text-white font-black text-sm">{appt.start_time}</span>
                            </div>
                            <div>
                              <p className="text-white font-black uppercase text-sm tracking-tight">{appt.clients?.name || 'Cliente'}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{appt.services?.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest mb-2 inline-block shadow-sm ${appt.status === 'Agendado' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                              appt.status === 'Confirmado' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                'bg-gray-800 text-gray-400 border border-gray-700/50'
                              }`}>{appt.status}</span>
                            <span className="block text-sm font-black text-gray-300 tracking-tighter">R$ {Number(appt.price).toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-16 text-center">
                      <div className="w-16 h-16 bg-gray-800/20 rounded-full flex items-center justify-center text-gray-800 mx-auto mb-4">
                        <CalendarCheck size={32} />
                      </div>
                      <p className="text-gray-600 font-black text-xs uppercase tracking-widest">Nenhum atendimento</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card de Meta Semanal - Redesigned */}
              <div className="bg-gradient-to-br from-dark-900 to-dark-950 rounded-[2.5rem] border border-gray-800/80 p-10 flex flex-col items-center text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-3xl rounded-full -mr-32 -mt-32"></div>

                <div className="w-20 h-20 bg-primary-500/10 rounded-[1.75rem] flex items-center justify-center text-primary-500 mb-6 border border-primary-500/20 shadow-xl shadow-primary-500/5 relative z-10">
                  <Crown size={40} />
                </div>

                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2 relative z-10">Meta Semanal</h3>
                <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-10 relative z-10">Desempenho Profissional</p>

                {currentUser.weeklyGoal && currentUser.weeklyGoal > 0 ? (
                  <div className="w-full space-y-8 relative z-10">
                    <div className="flex justify-between items-end mb-2 px-2">
                      <div className="text-left">
                        <span className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Produzido</span>
                        <span className="text-2xl font-black text-white">R$ {barberStats.totalProduction.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Objetivo</span>
                        <span className="text-2xl font-black text-primary-500">R$ {currentUser.weeklyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                      </div>
                    </div>

                    <div className="relative h-6 w-full bg-dark-950 rounded-full border border-gray-800 p-1 shadow-inner">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all duration-1000 shadow-lg shadow-primary-500/20 relative group"
                        style={{ width: `${Math.min(100, (barberStats.totalProduction / currentUser.weeklyGoal) * 100)}%` }}
                      >
                        <div className="absolute right-0 top-0 w-8 h-full bg-white/20 blur-sm rounded-full"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <span className="px-4 py-2 bg-primary-500/10 rounded-xl border border-primary-500/20 text-primary-500 font-black text-xs uppercase tracking-widest">
                        {Math.round((barberStats.totalProduction / currentUser.weeklyGoal) * 100)}% Alcançado
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 relative z-10">
                    <p className="text-gray-500 text-sm font-medium leading-relaxed italic">
                      Você ainda não definiu sua meta para esta semana. Metas ajudam você a evoluir profissionalmente!
                    </p>
                    <button
                      onClick={() => setActiveTabBarber('goals')}
                      className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-dark-950 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-primary-500/20"
                    >
                      Definir Agora
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-8 py-10 animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-dark-900/50 p-10 md:p-14 rounded-[3rem] border border-gray-800 shadow-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-3xl rounded-full -mr-32 -mt-32"></div>

              <div className="flex items-center gap-6 mb-12 relative z-10">
                <div className="w-20 h-20 bg-primary-500/10 rounded-[1.75rem] flex items-center justify-center text-primary-500 border border-primary-500/20 shadow-xl">
                  <TrendingUp size={36} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight">Faturamento Alvo</h2>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-1">Defina sua ambição semanal</p>
                </div>
              </div>

              <div className="space-y-10 relative z-10">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Objetivo de Vendas (R$)</label>
                  <div className="relative group">
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 font-black text-2xl group-focus-within:text-primary-500 transition-colors">R$</span>
                    <input
                      type="number"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      placeholder={currentUser.weeklyGoal?.toString() || "0,00"}
                      className="w-full bg-dark-950 border border-gray-800 rounded-[2.5rem] pl-20 pr-8 py-8 text-white text-4xl font-black focus:border-primary-500 outline-none transition-all shadow-2xl tracking-tighter"
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
                  className="w-full bg-primary-500 hover:bg-primary-600 active:scale-95 text-dark-950 font-black py-8 rounded-[2.5rem] shadow-2xl shadow-primary-500/20 transition-all uppercase tracking-[0.2em] text-xs"
                >
                  Confirmar Nova Meta
                </button>

                <div className="flex items-center justify-center gap-4 text-gray-600">
                  <div className="w-10 h-px bg-gray-800"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Foco & Disciplina</p>
                  <div className="w-10 h-px bg-gray-800"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAIS DE DETALHES - BOTTOM SHEET REFACTORED --- */}
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-dark-950 w-full max-w-xl rounded-t-[3rem] md:rounded-[3rem] border-t md:border border-gray-800/80 shadow-3xl overflow-hidden animate-in slide-in-from-bottom-40 md:zoom-in-95 duration-500">
              <div className="p-8 md:p-10 border-b border-gray-800/80 flex items-center justify-between bg-dark-900/40 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-gray-800/50 rounded-b-full md:hidden"></div>
                <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                  {activeModal === 'production' && <><div className="p-3 bg-primary-500/10 rounded-xl text-primary-500 border border-primary-500/20"><Scissors size={20} /></div> Produção de Hoje</>}
                  {activeModal === 'commission' && <><div className="p-3 bg-green-500/10 rounded-xl text-green-500 border border-green-500/20"><Wallet size={20} /></div> Minha Comissão</>}
                  {activeModal === 'appointments' && <><div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20"><CalendarCheck size={20} /></div> Meus Atendimentos</>}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-12 h-12 flex items-center justify-center bg-gray-800/50 hover:bg-gray-800 rounded-2xl text-gray-400 transition-all"
                >
                  <Plus className="rotate-45" size={28} />
                </button>
              </div>

              <div className="p-8 md:p-10 max-h-[70vh] overflow-y-auto custom-scrollbar bg-dark-900/30">
                {activeModal === 'production' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-primary-500 p-8 rounded-[2rem] flex flex-col items-center text-dark-950 shadow-2xl shadow-primary-500/20">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-60">Total Bruto</span>
                      <span className="text-4xl font-black tracking-tighter">R$ {barberStats.totalProduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Discriminação de Serviços</p>
                      {barberStats.todayAppointments.filter((a: any) => a.status !== 'Cancelado').map((appt: any, idx: number) => (
                        <div key={idx} className="bg-dark-900/60 p-5 rounded-3xl flex justify-between items-center border border-gray-800 group hover:border-primary-500/30 transition-all">
                          <div>
                            <p className="text-white font-black text-sm uppercase tracking-tight">{appt.services?.name || 'Serviço'}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{appt.clients?.name} • {appt.start_time}</p>
                          </div>
                          <p className="text-white font-black text-base tracking-tighter">R$ {Number(appt.price).toFixed(2).replace('.', ',')}</p>
                        </div>
                      ))}
                      {barberStats.todayAppointments.filter((a: any) => a.status !== 'Cancelado').length === 0 && (
                        <div className="text-center py-10 opacity-30">
                          <Scissors size={40} className="mx-auto mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest">Nenhuma atividade registrada</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeModal === 'commission' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-dark-950 p-6 rounded-[2rem] border border-gray-800/80 shadow-xl">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Sua Taxa</p>
                        <p className="text-3xl font-black text-white">{currentUser.commissionRate}%</p>
                      </div>
                      <div className="bg-green-500/10 p-6 rounded-[2rem] border border-green-500/20 shadow-xl">
                        <p className="text-[10px] text-green-500/70 font-black uppercase tracking-widest mb-2">Líquido (Est.)</p>
                        <p className="text-3xl font-black text-green-500 tracking-tighter">R$ {(barberStats.totalProduction * (currentUser.commissionRate / 100)).toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-3xl">
                      <p className="text-[11px] text-blue-400 font-bold flex gap-4 leading-relaxed">
                        <Clock size={20} className="shrink-0" />
                        <span>Estes valores são projetados com base na sua produção bruta atual. O pagamento oficial é processado pelo setor financeiro da unidade.</span>
                      </p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Ganhos por Atendimento</p>
                      {barberStats.todayAppointments.filter((a: any) => a.status !== 'Cancelado').map((appt: any, idx: number) => (
                        <div key={idx} className="bg-dark-900/60 p-5 rounded-3xl flex justify-between items-center border border-gray-800">
                          <div>
                            <p className="text-gray-300 font-black text-sm uppercase tracking-tight">{appt.services?.name}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Prod: R$ {Number(appt.price).toFixed(2).replace('.', ',')} • {currentUser.commissionRate}%</p>
                          </div>
                          <p className="text-green-500/80 font-black text-sm tracking-tighter">R$ {(Number(appt.price) * (currentUser.commissionRate / 100)).toFixed(2).replace('.', ',')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeModal === 'appointments' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex gap-4">
                      <div className="flex-1 bg-dark-950 p-6 rounded-[2rem] border border-gray-800 text-center shadow-xl">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Total Hoje</p>
                        <p className="text-3xl font-black text-white">{barberStats.appointmentsCount}</p>
                      </div>
                      <div className="flex-1 bg-primary-500/10 p-6 rounded-[2rem] border border-primary-500/20 text-center shadow-xl">
                        <p className="text-[10px] text-primary-500 font-black uppercase tracking-widest mb-1">Pendentes</p>
                        <p className="text-3xl font-black text-white">{barberStats.upcomingAppointments.length}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Status dos Agendamentos</p>
                      {barberStats.todayAppointments.map((appt: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-5 bg-dark-900/60 rounded-3xl border border-gray-800">
                          <div className="flex items-center gap-5">
                            <div className="bg-dark-950 border border-gray-800 px-3 py-1.5 rounded-xl text-primary-500 font-black text-xs">
                              {appt.start_time}
                            </div>
                            <div>
                              <p className="text-white text-sm font-black uppercase tracking-tight">{appt.clients?.name}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{appt.services?.name}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${appt.status === 'Agendado' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                            appt.status === 'Confirmado' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                              appt.status === 'Concluído' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                'bg-gray-800 text-gray-400 border border-gray-700/50'
                            }`}>
                            {appt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 md:p-10 bg-dark-950/80 border-t border-gray-800">
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-black py-5 rounded-[2rem] transition-all uppercase tracking-widest text-[10px]"
                >
                  Retornar ao Painel
                </button>
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
      <div className="space-y-10 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">Painel da Recepção 🛎️</h1>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Gestão Operacional e Fluxo de Clientes</p>
          </div>
          <div className="px-5 py-2.5 bg-dark-900/50 rounded-2xl border border-gray-800 text-gray-400 font-black text-[10px] uppercase tracking-widest w-fit shadow-xl">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* Atalhos Operacionais - Premium Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          <Link to="/schedule" className="bg-dark-900/40 p-6 md:p-8 rounded-[2rem] border border-gray-800/50 hover:border-primary-500/50 transition-all group shadow-2xl relative overflow-hidden active:scale-95">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 blur-2xl rounded-full -mr-10 -mt-10"></div>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500 mb-4 md:mb-6 group-hover:scale-110 group-hover:bg-primary-500 group-hover:text-dark-950 transition-all duration-300">
              <CalendarCheck size={26} />
            </div>
            <h3 className="text-sm md:text-base font-black text-white mb-1 uppercase tracking-tight">Agenda</h3>
            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Controle</p>
          </Link>

          <Link to="/comandas" className="bg-dark-900/40 p-6 md:p-8 rounded-[2rem] border border-gray-800/50 hover:border-green-500/50 transition-all group shadow-2xl relative overflow-hidden active:scale-95">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 blur-2xl rounded-full -mr-10 -mt-10"></div>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-4 md:mb-6 group-hover:scale-110 group-hover:bg-green-500 group-hover:text-dark-950 transition-all duration-300">
              <Scissors size={26} />
            </div>
            <h3 className="text-sm md:text-base font-black text-white mb-1 uppercase tracking-tight">Comandas</h3>
            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Vendas</p>
          </Link>

          <Link to="/clients" className="bg-dark-900/40 p-6 md:p-8 rounded-[2rem] border border-gray-800/50 hover:border-purple-500/50 transition-all group shadow-2xl relative overflow-hidden active:scale-95">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 blur-2xl rounded-full -mr-10 -mt-10"></div>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-4 md:mb-6 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-dark-950 transition-all duration-300">
              <Users size={26} />
            </div>
            <h3 className="text-sm md:text-base font-black text-white mb-1 uppercase tracking-tight">Clientes</h3>
            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Base</p>
          </Link>

          <Link to="/subscriptions" className="bg-dark-900/40 p-6 md:p-8 rounded-[2rem] border border-gray-800/50 hover:border-yellow-500/50 transition-all group shadow-2xl relative overflow-hidden active:scale-95">
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 blur-2xl rounded-full -mr-10 -mt-10"></div>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 mb-4 md:mb-6 group-hover:scale-110 group-hover:bg-yellow-500 group-hover:text-dark-950 transition-all duration-300">
              <Crown size={26} />
            </div>
            <h3 className="text-sm md:text-base font-black text-white mb-1 uppercase tracking-tight">VIPs</h3>
            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Planos</p>
          </Link>

          <Link to="/products" className="bg-dark-900/40 p-6 md:p-8 rounded-[2rem] border border-gray-800/50 hover:border-pink-500/50 transition-all group shadow-2xl relative overflow-hidden active:scale-95">
            <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/5 blur-2xl rounded-full -mr-10 -mt-10"></div>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500 mb-4 md:mb-6 group-hover:scale-110 group-hover:bg-pink-500 group-hover:text-dark-950 transition-all duration-300">
              <Package size={26} />
            </div>
            <h3 className="text-sm md:text-base font-black text-white mb-1 uppercase tracking-tight">Estoque</h3>
            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Produtos</p>
          </Link>
        </div>

        {/* Próximos Agendamentos - Enhanced List */}
        <div className="bg-dark-900/50 rounded-[3rem] border border-gray-800/50 overflow-hidden shadow-3xl">
          <div className="p-8 md:p-10 border-b border-gray-800/50 bg-dark-900/40 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-base md:text-lg font-black text-white uppercase tracking-tight flex items-center gap-4">
              <div className="p-3 bg-primary-500/10 rounded-xl text-primary-500 border border-primary-500/20">
                <Clock size={20} />
              </div>
              Fluxo da Recepção (Hoje)
            </h3>
            <Link to="/schedule" className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em] hover:text-primary-400 transition-colors bg-primary-500/5 px-4 py-2 rounded-full border border-primary-500/10">
              Ver Agenda Completa
            </Link>
          </div>
          <div className="divide-y divide-gray-800/[0.05]">
            {stats.todayAppointments.length > 0 ? (
              stats.todayAppointments.map((appt: any, idx: number) => (
                <div key={idx} className="p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-primary-500/[0.015] transition-all group">
                  <div className="flex items-center gap-6 mb-4 sm:mb-0">
                    <div className="flex flex-col items-center justify-center bg-dark-950 w-16 h-16 rounded-[1.25rem] border border-gray-800 group-hover:border-primary-500/30 transition-all shadow-xl">
                      <span className="font-black text-primary-500 text-xl tracking-tighter">{appt.start_time}</span>
                    </div>
                    <div>
                      <p className="text-white font-black uppercase text-base tracking-tight">{appt.clients?.name || 'Cliente'}</p>
                      <p className="text-sm text-gray-500 font-bold tracking-tight mt-1">{appt.services?.name}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                        <User size={12} className="text-gray-600" /> Profissional: <span className="text-primary-500/80">{appt.profiles?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto text-right">
                    <span className={`inline-block px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${appt.status === 'Confirmado' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                      appt.status === 'Agendado' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-dark-950 text-gray-500 border-gray-800'
                      }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-20 text-center opacity-30">
                <CalendarCheck size={48} className="mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">Sem agendamentos pendentes</p>
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
      <div className="space-y-10 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">Dashboard Admin 💎</h1>
          <div className="px-5 py-2.5 bg-dark-900/50 rounded-2xl border border-gray-800 text-gray-400 font-black text-[10px] uppercase tracking-widest w-fit shadow-xl">
            Painel Executivo
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Receita de Hoje"
            value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            change="Somente comandas pagas"
            positive={true}
            icon={Wallet}
          />
          <StatsCard
            title="Atendimentos"
            value={stats.totalAppointments}
            change="Confirmados Hoje"
            positive={true}
            icon={CalendarCheck}
            color="text-blue-500"
          />
          <StatsCard
            title="Novos Clientes"
            value={stats.newClients}
            change="Base Ativa"
            positive={true}
            icon={Users}
            color="text-purple-500"
          />
          <StatsCard
            title="Ticket Médio (90 dias)"
            value={`R$ ${stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            change="Média trimestral"
            positive={true}
            icon={TrendingUp}
            color="text-green-500"
          />
          <StatsCard
            title="MRR Assinaturas"
            value={`R$ ${stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            change="Recorrência VIP"
            positive={true}
            icon={Crown}
            color="text-yellow-500"
          />
          <StatsCard
            title="Provisão Comissões"
            value={`R$ ${stats.commissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            change="A pagar (Est.)"
            positive={false}
            icon={Percent}
            color="text-pink-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-dark-900/40 p-8 md:p-10 rounded-[3rem] border border-gray-800/50 shadow-3xl">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                <div className="p-3 bg-primary-500/10 rounded-xl text-primary-500 border border-primary-500/20">
                  <BarChart3 size={20} />
                </div>
                Performance (Últ. 7 dias)
              </h3>
            </div>
            <div className="h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.weeklyRevenue}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    stroke="#4b5563"
                    tick={{ fill: '#9ca3af', fontWeight: 'bold', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#4b5563"
                    tick={{ fill: '#9ca3af', fontWeight: 'bold', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `R$${value}`}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #374151',
                      borderRadius: '16px',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                      padding: '12px'
                    }}
                    itemStyle={{ color: '#eab308', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}
                    labelStyle={{ color: '#ffffff', marginBottom: '4px', fontWeight: '900', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#eab308"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-dark-900/60 p-10 rounded-[3rem] border border-gray-800 shadow-3xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Ações Executivas</h3>
              <div className="space-y-6">
                <Link to="/comandas" className="group flex items-center justify-between p-6 bg-primary-500 hover:bg-primary-600 text-dark-950 font-black rounded-3xl transition-all shadow-xl shadow-primary-500/20 active:scale-95">
                  <span className="uppercase tracking-[0.2em] text-[10px]">Gestão de Comandas</span>
                  <Scissors size={20} className="group-hover:rotate-12 transition-transform" />
                </Link>
                <Link to="/financial" className="group flex items-center justify-between p-6 bg-dark-950 hover:bg-gray-800 text-white font-black rounded-3xl border border-gray-800 transition-all shadow-xl active:scale-95">
                  <span className="uppercase tracking-[0.2em] text-[10px]">Fluxo de Caixa</span>
                  <Wallet size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="mt-12 p-6 bg-dark-950 rounded-3xl border border-gray-800/50 italic">
              <p className="text-[11px] text-gray-500 leading-relaxed text-center">
                "O sucesso é a soma de pequenos esforços repetidos dia após dia."
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO: VISÃO SaaS ---
  if (role?.startsWith('saas_')) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-10 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center text-primary-500 mb-4 border border-primary-500/20 shadow-2xl">
          <TrendingUp size={48} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">Painel SaaS 🚀</h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs mt-3">Sua central de vendas e gestão</p>
        </div>
        <div className="max-w-md w-full bg-dark-900/50 p-8 rounded-[2rem] border border-gray-800 shadow-xl space-y-4">
          <p className="text-sm text-gray-400">
            Bem-vindo à equipe Mestre da Barbearia! Utilize o menu lateral para registrar novas vendas, acompanhar suas prospecções e gerenciar suas comissões.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Link to="/saas-admin" className="p-4 bg-dark-950 rounded-2xl border border-gray-800 hover:border-primary-500/50 transition-all font-black text-xs text-white uppercase tracking-widest flex flex-col items-center gap-2">
              <Briefcase size={20} className="text-primary-500" />
              Minhas Vendas
            </Link>
            <Link to="/prospeccao" className="p-4 bg-dark-950 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all font-black text-xs text-white uppercase tracking-widest flex flex-col items-center gap-2">
              <Package size={20} className="text-blue-500" />
              Prospecção
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Dashboard;
