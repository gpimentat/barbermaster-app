
import React, { useEffect, useState } from 'react';
import { Users, DollarSign, Activity, TrendingUp, TrendingDown, UserPlus } from 'lucide-react';
import { supabase } from '../src/supabaseClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { dashboardService, SaaSStats } from '../src/services/dashboardService';
import { useAuth } from '../AuthContext';

const SaasAdminPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<SaaSStats | null>(null);
    const [tenants, setTenants] = useState<any[]>([]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const { stats: saasStats, tenants: tenantList } = await dashboardService.getSaasStats(currentUser?.email);
            setStats(saasStats);
            setTenants(tenantList);
        } catch (error) {
            console.error('Erro ao buscar estatísticas SaaS:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 animate-in fade-in">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-medium">Carregando métricas SaaS...</p>
            </div>
        );
    }


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-white mb-8">Painel Super Admin (SaaS)</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-dark-900 border border-gray-800 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Users className="text-blue-500" size={24} />
                        </div>
                        <span className="flex items-center text-green-500 text-xs font-bold gap-1 bg-green-500/10 px-2 py-1 rounded-lg">
                            <TrendingUp size={12} /> +12%
                        </span>
                    </div>
                    <h3 className="text-gray-400 text-sm font-medium">Usuários Totais</h3>
                    <p className="text-3xl font-bold text-white mt-1">{stats.totalTenants}</p>
                </div>

                <div className="bg-dark-900 border border-gray-800 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-500/10 rounded-xl">
                            <DollarSign className="text-green-500" size={24} />
                        </div>
                        <span className="flex items-center text-green-500 text-xs font-bold gap-1 bg-green-500/10 px-2 py-1 rounded-lg">
                            <TrendingUp size={12} /> +8%
                        </span>
                    </div>
                    <h3 className="text-gray-400 text-sm font-medium">MRR (Recorrente)</h3>
                    <p className="text-3xl font-bold text-white mt-1">R$ {stats.mrr.toLocaleString('pt-BR')}</p>
                </div>

                <div className="bg-dark-900 border border-gray-800 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Activity className="text-purple-500" size={24} />
                        </div>
                    </div>
                    <h3 className="text-gray-400 text-sm font-medium">Usuários Ativos</h3>
                    <p className="text-3xl font-bold text-white mt-1">{stats.activeTenants}</p>
                </div>

                <div className="bg-dark-900 border border-gray-800 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-500/10 rounded-xl">
                            <TrendingDown className="text-red-500" size={24} />
                        </div>
                        <span className="flex items-center text-green-500 text-xs font-bold gap-1 bg-green-500/10 px-2 py-1 rounded-lg">
                            -0.5%
                        </span>
                    </div>
                    <h3 className="text-gray-400 text-sm font-medium">Churn Rate</h3>
                    <p className="text-3xl font-bold text-white mt-1">{stats.churnRate}%</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-dark-900 border border-gray-800 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Crescimento de Receita (MRR)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.revenueGrowth}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" axisLine={false} tickLine={false} />
                                <YAxis stroke="#666" axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-dark-900 border border-gray-800 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Novos Usuários (Últimos 6 meses)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.newUserGrowth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" axisLine={false} tickLine={false} />
                                <YAxis stroke="#666" axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#333' }}
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-dark-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Usuários Cadastrados</h3>
                    <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                        <UserPlus size={16} /> Novo Usuário
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4 font-bold">Usuário</th>
                                <th className="px-6 py-4 font-bold">Role</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {tenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                                                {tenant.name?.[0] || 'T'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white text-sm">{tenant.name || 'Sem Nome'}</p>
                                                <p className="text-xs text-gray-500">ID: {tenant.id.split('-')[0]}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold bg-gray-700 text-gray-300`}>
                                            Tenant
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block w-2 h-2 rounded-full ${tenant.active !== false ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
                                        <span className="text-sm text-gray-300">{tenant.active !== false ? 'Ativo' : 'Inativo'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-400 hover:text-white transition-colors text-sm">Gerenciar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SaasAdminPage;
