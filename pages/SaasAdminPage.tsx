
import React, { useEffect, useState } from 'react';
import {
  Users, DollarSign, Activity, TrendingUp, TrendingDown, UserPlus, X,
  BarChart2, Briefcase, Shield, Headphones, ChevronDown, Edit2, ToggleLeft, ToggleRight, Check,
  ShoppingBag, CheckCircle, AlertCircle, Clock, Wallet
} from 'lucide-react';
import { supabase } from '../src/supabaseClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { dashboardService, SaaSStats } from '../src/services/dashboardService';
import { useAuth } from '../AuthContext';

// --- Types ---
interface SaasStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  active: boolean;
  created_at?: string;
  saas_commission_new?: number;
  saas_commission_recurring?: number;
  saas_commission_recurring_type?: 'flat' | 'percent';
}

interface SaasSalesSubmission {
  id: string;
  salesperson_id: string;
  shop_name: string;
  manager_name: string;
  manager_email: string;
  manager_password: string;
  plan_value: number;
  payment_method: string;
  commission_percentage: number;
  commission_recurring_value: number;
  commission_recurring_type: string;
  status: 'pending' | 'approved' | 'rejected';
  finance_notes?: string;
  created_at: string;
  approved_at?: string;
  salesperson?: { name: string };
}

const SAAS_ROLES = [
  { value: 'saas_manager', label: 'Gerente SaaS', icon: '👑', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  { value: 'saas_sales', label: 'Vendedor', icon: '💼', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  { value: 'saas_support', label: 'Suporte', icon: '🎧', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { value: 'saas_finance', label: 'Financeiro', icon: '💰', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
];

const getRoleInfo = (role: string) =>
  SAAS_ROLES.find(r => r.value === role) || { value: role, label: role, icon: '👤', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30' };

// --- Main Component ---
const SaasAdminPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'sales'>('dashboard');

  // Dashboard state
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SaaSStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isNewShopModalOpen, setIsNewShopModalOpen] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [newShop, setNewShop] = useState({ shopName: '', name: '', email: '', password: '' });

  // Team state
  const [saasStaff, setSaasStaff] = useState<SaasStaff[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<SaasStaff | null>(null);
  const [savingStaff, setSavingStaff] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['saas_support']);
  const [staffForm, setStaffForm] = useState({
    name: '', email: '', password: '',
    commission_new: '0',
    commission_recurring: '0',
    commission_recurring_type: 'flat' as 'flat' | 'percent',
  });

  // Sales Workflow state
  const [submissions, setSubmissions] = useState<SaasSalesSubmission[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [isNewSubmissionModalOpen, setIsNewSubmissionModalOpen] = useState(false);
  const [savingSubmission, setSavingSubmission] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    shopName: '', managerName: '', email: '', password: '', planValue: '', paymentMethod: 'pix'
  });

  // Permissions helpers
  const isSales = currentUser?.role === 'saas_sales' || currentUser?.permissions?.includes('saas_sales');
  const isFinance = currentUser?.role === 'saas_finance' || currentUser?.permissions?.includes('saas_finance');
  const isManager = currentUser?.role === 'saas_manager' || currentUser?.role === 'super_admin' || currentUser?.email === 'g.pimentat@gmail.com';

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (activeTab === 'team') fetchSaasTeam(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'sales') fetchSubmissions(); }, [activeTab]);

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

  const fetchSaasTeam = async () => {
    try {
      setLoadingTeam(true);
      // SaaS staff have no tenant_id and have saas_ roles
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, permissions, active, created_at')
        .is('tenant_id', null)
        .like('role', 'saas_%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSaasStaff(data || []);
    } catch (err) {
      console.error('Erro ao buscar equipe SaaS:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  // Derive all roles for a member: primary role + saas_ entries in permissions
  const getMemberRoles = (member: SaasStaff): string[] => {
    const extra = (member.permissions || []).filter(p => p.startsWith('saas_'));
    const all = [member.role, ...extra.filter(e => e !== member.role)];
    return all.filter(Boolean);
  };

  const openCreateStaff = () => {
    setEditingStaff(null);
    setStaffForm({ name: '', email: '', password: '', commission_new: '0', commission_recurring: '0', commission_recurring_type: 'flat' });
    setSelectedRoles(['saas_support']);
    setIsStaffModalOpen(true);
  };

  const openEditStaff = (member: SaasStaff) => {
    setEditingStaff(member);
    setStaffForm({
      name: member.name, email: member.email, password: '',
      commission_new: String((member as any).saas_commission_new ?? 0),
      commission_recurring: String((member as any).saas_commission_recurring ?? 0),
      commission_recurring_type: (member as any).saas_commission_recurring_type ?? 'flat',
    });
    setSelectedRoles(getMemberRoles(member));
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingStaff) return;
    if (!staffForm.name || !staffForm.email || (!editingStaff && !staffForm.password)) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    if (selectedRoles.length === 0) {
      alert('Selecione pelo menos um cargo.');
      return;
    }

    try {
      setSavingStaff(true);
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Primary role = first selected; extras stored in permissions array
      const primaryRole = selectedRoles[0];
      const payload: any = {
        name: staffForm.name,
        email: staffForm.email,
        role: primaryRole,
        active: true,
        commission_rate: 0,
        permissions: selectedRoles, // all selected roles stored here
        login_enabled: true,
        tenant_id: null, // SaaS staff — no barbershop
      };

      if (editingStaff) {
        payload.id = editingStaff.id;
        if (staffForm.password) payload.password = staffForm.password;
      } else {
        payload.password = staffForm.password;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/manage-staff`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao salvar membro');

      // Persist commission settings (new columns not in edge function)
      await supabase.from('profiles').update({
        saas_commission_new: Number(staffForm.commission_new) || 0,
        saas_commission_recurring: Number(staffForm.commission_recurring) || 0,
        saas_commission_recurring_type: staffForm.commission_recurring_type,
      }).eq('id', result.id);

      setIsStaffModalOpen(false);
      fetchSaasTeam();
    } catch (err: any) {
      alert(`❌ Erro: ${err.message}`);
    } finally {
      setSavingStaff(false);
    }
  };

  const handleToggleActive = async (member: SaasStaff) => {
    const { error } = await supabase
      .from('profiles')
      .update({ active: !member.active })
      .eq('id', member.id);
    if (!error) fetchSaasTeam();
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingShop) return;
    if (!newShop.shopName || !newShop.name || !newShop.email || !newShop.password) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    try {
      setSavingShop(true);
      const slug = newShop.shopName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim();

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: newShop.shopName, slug, subscription_status: 'active', settings: {} })
        .select().single();
      if (tenantError) throw tenantError;

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-staff`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newShop.name, email: newShop.email, password: newShop.password,
          role: 'admin', active: true, tenant_id: tenant.id, login_enabled: true,
          commission_rate: 0, permissions: ['view_full_schedule', 'manage_schedule', 'manage_clients', 'view_financial'],
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao criar gestor');

      alert('✅ Barbearia e Gestor criados com sucesso!');
      setIsNewShopModalOpen(false);
      setNewShop({ shopName: '', name: '', email: '', password: '' });
      fetchStats();
    } catch (error: any) {
      alert(`❌ Falha: ${error.message}`);
    } finally {
      setSavingShop(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoadingSales(true);
      let query = supabase
        .from('saas_sales_submissions')
        .select('*, salesperson:profiles(name)')
        .order('created_at', { ascending: false });

      if (isSales && !isManager) {
        query = query.eq('salesperson_id', currentUser?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Erro ao buscar propostas:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleSaveSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingSubmission) return;
    if (!submissionForm.shopName || !submissionForm.managerName || !submissionForm.email || !submissionForm.password || !submissionForm.planValue) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSavingSubmission(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('saas_commission_new, saas_commission_recurring, saas_commission_recurring_type')
        .eq('id', currentUser?.id)
        .single();

      const { error } = await supabase
        .from('saas_sales_submissions')
        .insert({
          salesperson_id: currentUser?.id,
          shop_name: submissionForm.shopName,
          manager_name: submissionForm.managerName,
          manager_email: submissionForm.email,
          manager_password: submissionForm.password,
          plan_value: Number(submissionForm.planValue),
          payment_method: submissionForm.paymentMethod,
          commission_percentage: profile?.saas_commission_new || 0,
          commission_recurring_value: profile?.saas_commission_recurring || 0,
          commission_recurring_type: profile?.saas_commission_recurring_type || 'flat',
          status: 'pending'
        });

      if (error) throw error;

      alert('✅ Proposta enviada com sucesso! Aguarde a aprovação do financeiro.');
      setIsNewSubmissionModalOpen(false);
      setSubmissionForm({ shopName: '', managerName: '', email: '', password: '', planValue: '', paymentMethod: 'pix' });
      fetchSubmissions();
    } catch (err: any) {
      alert(`❌ Erro ao enviar proposta: ${err.message}`);
    } finally {
      setSavingSubmission(false);
    }
  };

  const handleApproveSubmission = async (sub: SaasSalesSubmission) => {
    if (!confirm(`Aprovar e liberar acesso para "${sub.shop_name}"?`)) return;

    try {
      setLoadingSales(true);
      
      const slug = sub.shop_name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim();

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ 
          name: sub.shop_name, 
          slug, 
          subscription_status: 'active', 
          settings: {},
          referral_salesperson_id: sub.salesperson_id,
          recurring_commission_value: sub.commission_recurring_value,
        })
        .select().single();
      if (tenantError) throw tenantError;

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-staff`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sub.manager_name, email: sub.manager_email, password: sub.manager_password,
          role: 'admin', active: true, tenant_id: tenant.id, login_enabled: true,
          commission_rate: 0, permissions: ['view_full_schedule', 'manage_schedule', 'manage_clients', 'view_financial'],
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao criar gestor');

      const initialCommissionAmount = sub.plan_value * (sub.commission_percentage / 100);
      await supabase.from('saas_commissions').insert({
        salesperson_id: sub.salesperson_id,
        tenant_id: tenant.id,
        amount: initialCommissionAmount,
        type: 'new_client',
        status: 'pending',
        month: new Date().toISOString().substring(0, 7),
        description: `Comissão inicial - ${sub.shop_name}`
      });

      await supabase.from('saas_notifications').insert({
        user_id: sub.salesperson_id,
        title: 'Sistema Liberado!',
        message: `O acesso para a barbearia "${sub.shop_name}" foi aprovado e liberado pelo financeiro.`
      });

      await supabase.from('saas_sales_submissions')
        .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: currentUser?.id })
        .eq('id', sub.id);

      alert('✅ Venda aprovada! A barbearia foi criada e o vendedor notificado.');
      fetchSubmissions();
      fetchStats();
    } catch (err: any) {
      alert(`❌ Erro ao aprovar: ${err.message}`);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleRejectSubmission = async (sub: SaasSalesSubmission) => {
    const reason = prompt('Motivo da rejeição:');
    if (reason === null) return;

    try {
      setLoadingSales(true);
      await supabase.from('saas_sales_submissions')
        .update({ status: 'rejected', finance_notes: reason })
        .eq('id', sub.id);
      
      await supabase.from('saas_notifications').insert({
          user_id: sub.salesperson_id,
          title: 'Venda Rejeitada',
          message: `A proposta para "${sub.shop_name}" foi rejeitada. Motivo: ${reason}`
      });

      fetchSubmissions();
    } catch (err: any) {
      alert('Erro ao rejeitar proposta');
    } finally {
      setLoadingSales(false);
    }
  };

  if (loading && activeTab === 'dashboard') {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 animate-in fade-in">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium">Carregando métricas SaaS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Painel Super Admin [v1.1]</h1>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">Gerenciamento Global de Vendas e Equipe</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-900/60 p-1.5 rounded-2xl border border-gray-800/50 w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-primary-500 text-dark-950 shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <BarChart2 size={16} />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'team' ? 'bg-primary-500 text-dark-950 shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <Briefcase size={16} />
          Equipe SaaS
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'sales' ? 'bg-primary-500 text-dark-950 shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <ShoppingBag size={16} />
          Vendas
        </button>
      </div>

      {/* ── TAB: DASHBOARD ── */}
      {activeTab === 'dashboard' && stats ? (
        <div className="space-y-6">
          {/* Stats Cards ... (keep existing cards) ... */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-dark-900 border border-gray-800 p-6 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl"><Users className="text-blue-500" size={24} /></div>
                <span className="flex items-center text-green-500 text-xs font-bold gap-1 bg-green-500/10 px-2 py-1 rounded-lg"><TrendingUp size={12} /> +12%</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">Usuários Totais</h3>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalTenants}</p>
            </div>
            <div className="bg-dark-900 border border-gray-800 p-6 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-green-500/10 rounded-xl"><DollarSign className="text-green-500" size={24} /></div>
                <span className="flex items-center text-green-500 text-xs font-bold gap-1 bg-green-500/10 px-2 py-1 rounded-lg"><TrendingUp size={12} /> +8%</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">MRR (Recorrente)</h3>
              <p className="text-3xl font-bold text-white mt-1">R$ {stats.mrr.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-dark-900 border border-gray-800 p-6 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-500/10 rounded-xl"><Activity className="text-purple-500" size={24} /></div>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">Usuários Ativos</h3>
              <p className="text-3xl font-bold text-white mt-1">{stats.activeTenants}</p>
            </div>
            <div className="bg-dark-900 border border-gray-800 p-6 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl"><TrendingDown className="text-red-500" size={24} /></div>
                <span className="flex items-center text-green-500 text-xs font-bold gap-1 bg-green-500/10 px-2 py-1 rounded-lg">-0.5%</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">Churn Rate</h3>
              <p className="text-3xl font-bold text-white mt-1">{stats.churnRate}%</p>
            </div>
          </div>

          {/* Charts */}
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
                    <YAxis stroke="#666" axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
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
                    <Tooltip cursor={{ fill: '#333' }} contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Barbershop Users Table */}
          <div className="bg-dark-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Barbearias Cadastradas</h3>
              <button onClick={() => setIsNewShopModalOpen(true)} className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                <UserPlus size={16} /> Nova Barbearia
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
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">{user.name?.[0] || 'U'}</div>
                          <div>
                            <p className="font-medium text-white text-sm">{user.name || 'Sem Nome'}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-primary-500/10 text-primary-500' : user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-gray-700 text-gray-300'}`}>{user.role}</span>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{user.tenants?.name || 'Sem Loja'}</p>
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
        </div>
      ) : activeTab === 'dashboard' && !loading && (
        <div className="py-20 flex flex-col items-center gap-4 text-center border border-gray-800 rounded-3xl bg-dark-900/40">
           <AlertCircle size={48} className="text-yellow-500 opacity-50" />
           <p className="text-white font-black text-lg uppercase tracking-tight">Falha ao carregar dashboard</p>
           <p className="text-gray-500 text-sm max-w-sm">Não conseguimos obter as estatísticas da rede. Verifique sua conexão ou permissões.</p>
           <button onClick={() => fetchStats()} className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700 font-bold transition-all">Tentar novamente</button>
        </div>
      )}

      {/* ── TAB: VENDAS ── */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Quick Actions for Sales */}
          {isSales && (
            <div className="flex justify-end">
              <button
                onClick={() => setIsNewSubmissionModalOpen(true)}
                className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20"
              >
                <ShoppingBag size={18} /> Registrar Nova Venda
              </button>
            </div>
          )}

          {/* Submissions Table */}
          <div className="bg-dark-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">Solicitações de Venda</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isFinance || isManager ? 'Propostas aguardando aprovação financeira' : 'Minhas vendas registradas'}
              </p>
            </div>

            {loadingSales ? (
              <div className="py-16 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-4 text-center">
                <span className="text-5xl">💼</span>
                <p className="text-white font-black text-lg uppercase tracking-tight">Nenhuma venda registrada</p>
                <p className="text-gray-500 text-sm">As vendas registradas pela equipe aparecerão aqui.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-4 font-bold">Cliente / Barbearia</th>
                      <th className="px-6 py-4 font-bold">Vendedor</th>
                      <th className="px-6 py-4 font-bold">Plano / PGTO</th>
                      <th className="px-6 py-4 font-bold">Data</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-black text-white text-sm">{sub.shop_name}</p>
                            <p className="text-xs text-gray-500">{sub.manager_name} ({sub.manager_email})</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-300">{sub.salesperson?.name || 'Sistema'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-black text-primary-500">R$ {sub.plan_value.toLocaleString('pt-BR')}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-black">{sub.payment_method}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                          {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            sub.status === 'approved' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                            sub.status === 'rejected' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                          }`}>
                            {sub.status === 'approved' && <CheckCircle size={12} />}
                            {sub.status === 'rejected' && <AlertCircle size={12} />}
                            {sub.status === 'pending' && <Clock size={12} />}
                            {sub.status === 'approved' ? 'Aprovado' : sub.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </span>
                          {sub.finance_notes && (
                            <p className="text-[10px] text-red-400 mt-1 italic max-w-[200px] truncate" title={sub.finance_notes}>
                                Obs: {sub.finance_notes}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {sub.status === 'pending' && (isFinance || isManager) && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleRejectSubmission(sub)}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Rejeitar"
                              >
                                <X size={18} />
                              </button>
                              <button
                                onClick={() => handleApproveSubmission(sub)}
                                className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
                                title="Aprovar e Liberar"
                              >
                                <Check size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Role summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {SAAS_ROLES.map(role => {
              const count = saasStaff.filter(s => s.role === role.value && s.active).length;
              return (
                <div key={role.value} className={`bg-dark-900 border ${role.bg} p-5 rounded-2xl flex items-center gap-4`}>
                  <span className="text-3xl">{role.icon}</span>
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{role.label}</p>
                    <p className={`text-2xl font-black ${role.color}`}>{count}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Staff Table */}
          <div className="bg-dark-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Membros da Equipe SaaS</h3>
                <p className="text-xs text-gray-500 mt-0.5">Funcionários internos — sem acesso a nenhuma barbearia</p>
              </div>
              <button
                onClick={openCreateStaff}
                className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-primary-500/20"
              >
                <UserPlus size={16} /> Adicionar Membro
              </button>
            </div>

            {loadingTeam ? (
              <div className="py-16 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : saasStaff.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-4 text-center">
                <span className="text-5xl">👥</span>
                <p className="text-white font-black text-lg uppercase tracking-tight">Nenhum membro ainda</p>
                <p className="text-gray-500 text-sm">Adicione o primeiro funcionário da sua equipe SaaS.</p>
                <button onClick={openCreateStaff} className="mt-2 flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all">
                  <UserPlus size={16} /> Adicionar Membro
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-4 font-bold">Membro</th>
                      <th className="px-6 py-4 font-bold">Função</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {saasStaff.map((member) => {
                      const allRoles = getMemberRoles(member);
                      const primaryRoleInfo = getRoleInfo(allRoles[0]);
                      return (
                        <tr key={member.id} className="hover:bg-gray-800/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-lg font-black ${primaryRoleInfo.bg}`}>
                                {primaryRoleInfo.icon}
                              </div>
                              <div>
                                <p className="font-black text-white text-sm">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {allRoles.map(r => {
                                const info = getRoleInfo(r);
                                return (
                                  <span key={r} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${info.bg} ${info.color}`}>
                                    {info.icon} {info.label}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleActive(member)}
                              className="flex items-center gap-2 text-sm"
                            >
                              {member.active ? (
                                <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span><span className="text-green-400 font-bold">Ativo</span></>
                              ) : (
                                <><span className="w-2 h-2 rounded-full bg-gray-600"></span><span className="text-gray-500 font-bold">Inativo</span></>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => openEditStaff(member)}
                              className="text-gray-400 hover:text-primary-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Registrar Nova Venda ── */}
      {isNewSubmissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-dark-900 to-gray-900">
              <div>
                <h2 className="text-xl font-black text-white">Registrar Venda</h2>
                <p className="text-xs text-gray-500 mt-0.5">Submeta os dados para aprovação financeira</p>
              </div>
              <button onClick={() => setIsNewSubmissionModalOpen(false)} className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-xl transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveSubmission} className="p-6 space-y-4">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Dados da Barbearia</p>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Nome da Barbearia</label>
                  <input type="text" value={submissionForm.shopName} onChange={e => setSubmissionForm({ ...submissionForm, shopName: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder="Ex: Barbearia do Centro" required />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Dados do Gestor</p>
                <input type="text" value={submissionForm.managerName} onChange={e => setSubmissionForm({ ...submissionForm, managerName: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder="Nome do Gestor" required />
                <input type="email" value={submissionForm.email} onChange={e => setSubmissionForm({ ...submissionForm, email: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder="Email do Gestor" required />
                <input type="password" value={submissionForm.password} onChange={e => setSubmissionForm({ ...submissionForm, password: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder="Defina uma senha provisória" required />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Valor do Plano (R$)</label>
                  <input type="number" value={submissionForm.planValue} onChange={e => setSubmissionForm({ ...submissionForm, planValue: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder="0.00" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Pagamento</label>
                  <select value={submissionForm.paymentMethod} onChange={e => setSubmissionForm({ ...submissionForm, paymentMethod: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 appearance-none">
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="boleto">Boleto</option>
                    <option value="dinheiro">Dinheiro / Outro</option>
                  </select>
                </div>
              </div>

              <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-3 flex gap-3 items-start">
                <AlertCircle className="text-primary-500 shrink-0" size={16} />
                <p className="text-[10px] text-gray-400 leading-relaxed italic">
                  Sua comissão (fixa definida pelo admin) será capturada e bloqueada no momento da aprovação desta venda.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsNewSubmissionModalOpen(false)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-700 transition-all uppercase tracking-widest text-xs">Cancelar</button>
                <button type="submit" disabled={savingSubmission} className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-dark-950 font-black rounded-xl transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 uppercase tracking-widest text-xs">
                  {savingSubmission ? 'Enviando...' : 'Enviar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: New Barbershop ── */}
      {isNewShopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
              <h2 className="text-xl font-bold text-white">Nova Barbearia</h2>
              <button onClick={() => setIsNewShopModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateShop} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nome da Barbearia</label>
                <input type="text" value={newShop.shopName} onChange={e => setNewShop({ ...newShop, shopName: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" placeholder="Ex: Barber King" />
              </div>
              <div className="pt-4 border-t border-gray-800">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Dados do Gestor (Admin)</label>
                <div className="space-y-3">
                  <input type="text" value={newShop.name} onChange={e => setNewShop({ ...newShop, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" placeholder="Nome do Gestor" />
                  <input type="email" value={newShop.email} onChange={e => setNewShop({ ...newShop, email: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" placeholder="Email do Gestor" />
                  <input type="password" value={newShop.password} onChange={e => setNewShop({ ...newShop, password: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" placeholder="Senha Inicial (mín. 6 chars)" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsNewShopModalOpen(false)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg border border-gray-700">Cancelar</button>
                <button type="submit" disabled={savingShop} className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg disabled:opacity-50">
                  {savingShop ? 'Criando...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: SaaS Staff Create/Edit ── */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-gray-900 to-dark-900">
              <div>
                <h2 className="text-xl font-black text-white">{editingStaff ? 'Editar Membro' : 'Novo Membro da Equipe'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Equipe interna SaaS • Sem acesso a barbearias</p>
              </div>
              <button onClick={() => setIsStaffModalOpen(false)} className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-xl transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-6 space-y-5">
              {/* Multi-Role Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Cargos no SaaS</label>
                  <span className="text-[10px] text-gray-600 font-bold">{selectedRoles.length} selecionado{selectedRoles.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SAAS_ROLES.map((role) => {
                    const isSelected = selectedRoles.includes(role.value);
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => toggleRole(role.value)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all relative ${
                          isSelected ? `${role.bg} ${role.color} font-black` : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                        }`}
                      >
                        <span className="text-xl">{role.icon}</span>
                        <p className="text-xs font-black leading-tight flex-1">{role.label}</p>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'bg-current border-current' : 'border-gray-600'
                        }`}>
                          {isSelected && <Check size={10} className="text-dark-950" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nome completo</label>
                  <input type="text" value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder="Nome do funcionário" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">E-mail de acesso</label>
                  <input type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder="email@empresa.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Senha {editingStaff && <span className="text-gray-600 text-xs">(deixe vazio para manter)</span>}
                  </label>
                  <input type="password" value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder={editingStaff ? '••••••••' : 'Mínimo 6 caracteres'} />
                </div>
              </div>

              {/* Commission Settings - show when sales/manager role is selected */}
              {selectedRoles.some(r => ['saas_sales', 'saas_manager'].includes(r)) && (
                <div className="border border-primary-500/20 bg-primary-500/5 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-black text-primary-500 uppercase tracking-widest">Configuracao de Comissao</p>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Por novo cliente (R$)</label>
                    <input type="number" step="0.01" min="0" value={staffForm.commission_new}
                      onChange={e => setStaffForm({ ...staffForm, commission_new: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500 text-sm" placeholder="Ex: 100.00" />
                    <p className="text-[10px] text-gray-600 mt-1">Pago uma vez quando a barbearia assina</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Comissao recorrente (por renovacao)</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.01" min="0" value={staffForm.commission_recurring}
                        onChange={e => setStaffForm({ ...staffForm, commission_recurring: e.target.value })}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500 text-sm" placeholder="0" />
                      <select value={staffForm.commission_recurring_type}
                        onChange={e => setStaffForm({ ...staffForm, commission_recurring_type: e.target.value as 'flat' | 'percent' })}
                        className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500">
                        <option value="flat">R$ fixo</option>
                        <option value="percent">% mensalidade</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">Pago todo mes enquanto o cliente renovar</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsStaffModalOpen(false)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-700 transition-all">Cancelar</button>
                <button type="submit" disabled={savingStaff} className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-950 font-black rounded-xl transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 uppercase tracking-widest text-sm">
                  {savingStaff ? 'Salvando...' : editingStaff ? 'Salvar Alterações' : 'Criar Membro'}
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
