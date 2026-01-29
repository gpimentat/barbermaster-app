
import React, { useEffect, useState } from 'react';
import { Users, DollarSign, Activity, TrendingUp, TrendingDown, UserPlus, X } from 'lucide-react';
import { supabase } from '../src/supabaseClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { dashboardService, SaaSStats } from '../src/services/dashboardService';
import { useAuth } from '../AuthContext';

const SaasAdminPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<SaaSStats | null>(null);
    const [users, setUsers] = useState<any[]>([]);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newUser, setNewUser] = useState({
        shopName: '',
        name: '',
        email: '',
        password: ''
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const { stats: saasStats, users: userList } = await dashboardService.getSaasStats(currentUser?.email);
            setStats(saasStats);
            setUsers(userList);
        } catch (error) {
            console.error('Erro ao buscar estatísticas SaaS:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        if (!newUser.shopName || !newUser.name || !newUser.email || !newUser.password) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        try {
            setSaving(true);

            // 1. Create Tenant
            const slug = newUser.shopName.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .trim();

            const { data: tenant, error: tenantError } = await supabase
                .from('tenants')
                .insert({
                    name: newUser.shopName,
                    slug: slug,
                    subscription_status: 'active',
                    settings: {}
                })
                .select()
                .single();

            if (tenantError) throw tenantError;

            // 2. Create Owner Profile via Edge Function
            const { data: { session } } = await supabase.auth.getSession();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

            const response = await fetch(`${supabaseUrl}/functions/v1/manage-staff`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newUser.name,
                    email: newUser.email,
                    password: newUser.password,
                    role: 'admin',
                    active: true,
                    tenant_id: tenant.id,
                    login_enabled: true,
                    permissions: ['view_full_schedule', 'manage_schedule', 'manage_clients', 'view_financial', 'manage_integrations']
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Erro ao criar perfil do gestor');

            alert('✅ Barbearia e Gestor criados com sucesso!');
            setIsModalOpen(false);
            setNewUser({ shopName: '', name: '', email: '', password: '' });
            fetchStats();
        } catch (error: any) {
            console.error('Erro na criação:', error);
            alert(`❌ Falha ao criar: ${error.message}`);
        } finally {
            setSaving(false);
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
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                    >
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
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                                                {user.name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white text-sm">{user.name || 'Sem Nome'}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-primary-500/10 text-primary-500' :
                                                user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-500' :
                                                    'bg-gray-700 text-gray-300'
                                                }`}>
                                                {user.role}
                                            </span>
                                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{user.tenants?.name || 'Sem Loja'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block w-2 h-2 rounded-full ${user.active !== false ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
                                        <span className="text-sm text-gray-300">{user.active !== false ? 'Ativo' : 'Inativo'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-400 hover:text-white transition-colors text-sm">Editar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-dark-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
                            <h2 className="text-xl font-bold text-white">Novo Cliente SaaS</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nome da Barbearia</label>
                                <input
                                    type="text"
                                    value={newUser.shopName}
                                    onChange={e => setNewUser({ ...newUser, shopName: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    placeholder="Ex: Barber King"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-800">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Dados do Gestor (Admin)</label>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1 font-normal">Nome do Gestor</label>
                                        <input
                                            type="text"
                                            value={newUser.name}
                                            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                            placeholder="Nome completo"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1 font-normal">E-mail de Acesso</label>
                                        <input
                                            type="email"
                                            value={newUser.email}
                                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                            placeholder="email@exemplo.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1 font-normal">Senha Inicial</label>
                                        <input
                                            type="password"
                                            value={newUser.password}
                                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors border border-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors shadow-lg shadow-primary-500/20 disabled:opacity-50"
                                >
                                    {saving ? 'Criando...' : 'Criar Conta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaasAdminPage;
