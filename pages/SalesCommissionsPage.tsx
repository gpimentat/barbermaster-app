import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Calendar, Check, X, Plus, ChevronDown, Loader2, Award } from 'lucide-react';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

interface Commission {
  id: string;
  salesperson_id: string;
  tenant_id?: string;
  tenant_name?: string;
  type: 'new_client' | 'recurring' | 'manual';
  amount: number;
  description?: string;
  month: string;
  paid: boolean;
  paid_at?: string;
  created_at: string;
}

const TYPE_CONFIG = {
  new_client: { label: 'Novo Cliente', icon: '🆕', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  recurring:  { label: 'Recorrência', icon: '🔄', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  manual:     { label: 'Bônus Manual', icon: '⭐', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
};

const SalesCommissionsPage: React.FC = () => {
  const { currentUser, role } = useAuth();
  const isSuperAdmin = role === 'super_admin' || currentUser?.email === 'g.pimentat@gmail.com';

  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>(currentUser?.id || '');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCommission, setNewCommission] = useState({
    salesperson_id: '',
    tenant_name: '',
    type: 'new_client' as Commission['type'],
    amount: '',
    description: '',
  });

  useEffect(() => {
    if (isSuperAdmin) fetchSalespersons();
    else {
      setSelectedSalesperson(currentUser?.id || '');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSalesperson) fetchCommissions();
  }, [selectedSalesperson, selectedMonth]);

  const fetchSalespersons = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, role, saas_commission_new, saas_commission_recurring, saas_commission_recurring_type')
      .is('tenant_id', null)
      .like('role', 'saas_%');
    setSalespersons(data || []);
    if (data?.length && !selectedSalesperson) setSelectedSalesperson(data[0].id);
    setLoading(false);
  };

  const fetchCommissions = async () => {
    if (!selectedSalesperson) return;
    setLoading(true);
    const { data } = await supabase
      .from('saas_commissions')
      .select('*')
      .eq('salesperson_id', selectedSalesperson)
      .eq('month', selectedMonth)
      .order('created_at', { ascending: false });
    setCommissions(data || []);
    setLoading(false);
  };

  const totalMonth = commissions.reduce((s, c) => s + Number(c.amount), 0);
  const paidMonth = commissions.filter(c => c.paid).reduce((s, c) => s + Number(c.amount), 0);
  const pendingMonth = totalMonth - paidMonth;

  const handleMarkPaid = async (id: string, paid: boolean) => {
    await supabase.from('saas_commissions').update({
      paid: !paid,
      paid_at: !paid ? new Date().toISOString() : null,
    }).eq('id', id);
    fetchCommissions();
  };

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommission.salesperson_id || !newCommission.amount) return;
    setSaving(true);
    await supabase.from('saas_commissions').insert({
      salesperson_id: newCommission.salesperson_id,
      tenant_name: newCommission.tenant_name || null,
      type: newCommission.type,
      amount: Number(newCommission.amount),
      description: newCommission.description || null,
      month: selectedMonth,
    });
    setIsAddModalOpen(false);
    setNewCommission({ salesperson_id: '', tenant_name: '', type: 'new_client', amount: '', description: '' });
    if (newCommission.salesperson_id === selectedSalesperson) fetchCommissions();
    setSaving(false);
  };

  // Month navigation
  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(d.toISOString().slice(0, 7));
  };

  const monthLabel = new Date(selectedMonth + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Comissões 💰</h1>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">
            {isSuperAdmin ? 'Gestão de comissões da equipe SaaS' : 'Seu histórico de comissões'}
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => { setNewCommission({ ...newCommission, salesperson_id: selectedSalesperson }); setIsAddModalOpen(true); }}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-5 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-primary-500/20"
          >
            <Plus size={18} /> Lançar Comissão
          </button>
        )}
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {isSuperAdmin && salespersons.length > 0 && (
          <select
            value={selectedSalesperson}
            onChange={e => setSelectedSalesperson(e.target.value)}
            className="bg-dark-900 border border-gray-800 rounded-2xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary-500"
          >
            {salespersons.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
            ))}
          </select>
        )}

        {/* Month Picker */}
        <div className="flex items-center gap-2 bg-dark-900 border border-gray-800 rounded-2xl px-4 py-3">
          <button onClick={() => changeMonth(-1)} className="text-gray-500 hover:text-white transition-colors font-black">‹</button>
          <span className="text-white font-black text-sm uppercase tracking-wide px-3 min-w-[160px] text-center capitalize">{monthLabel}</span>
          <button onClick={() => changeMonth(1)} className="text-gray-500 hover:text-white transition-colors font-black">›</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary-500/20 to-primary-500/5 border border-primary-500/30 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center">
              <DollarSign className="text-primary-500" size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Total do Mês</p>
              <p className="text-3xl font-black text-white">R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-bold">{commissions.length} lançamento{commissions.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
              <Check className="text-green-500" size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Já Pago</p>
              <p className="text-3xl font-black text-green-400">R$ {paidMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-bold">{commissions.filter(c => c.paid).length} pago{commissions.filter(c => c.paid).length !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="text-yellow-500" size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">A Receber</p>
              <p className="text-3xl font-black text-yellow-400">R$ {pendingMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-bold">{commissions.filter(c => !c.paid).length} pendente{commissions.filter(c => !c.paid).length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Commission Settings (super admin only) */}
      {isSuperAdmin && selectedSalesperson && (() => {
        const sp = salespersons.find(s => s.id === selectedSalesperson);
        if (!sp) return null;
        return (
          <div className="bg-dark-900 border border-gray-800/50 rounded-3xl p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Configuração de Comissão — {sp.name}</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Por Novo Cliente</p>
                <p className="text-2xl font-black text-primary-500">R$ {Number(sp.saas_commission_new || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-600 mt-1">Pago uma vez no cadastro</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Recorrência</p>
                <p className="text-2xl font-black text-blue-400">
                  {sp.saas_commission_recurring_type === 'percent'
                    ? `${Number(sp.saas_commission_recurring || 0)}%`
                    : `R$ ${Number(sp.saas_commission_recurring || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </p>
                <p className="text-[10px] text-gray-600 mt-1">Por renovação mensal do cliente</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total acumulado</p>
                <p className="text-2xl font-black text-white">R$ {commissions.reduce((s, c) => s + Number(c.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-600 mt-1">Neste mês</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Commission History Table */}
      <div className="bg-dark-900 border border-gray-800/50 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-800/50">
          <h3 className="font-black text-white uppercase tracking-widest text-sm">Histórico do Mês</h3>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-primary-500" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <span className="text-5xl">📭</span>
            <p className="text-gray-400 font-black text-sm uppercase">Nenhuma comissão este mês</p>
            {isSuperAdmin && <p className="text-gray-600 text-xs">Use o botão "Lançar Comissão" para adicionar.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-800/40 text-gray-500 text-xs uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 font-black">Tipo</th>
                  <th className="px-6 py-4 font-black">Cliente/Descrição</th>
                  <th className="px-6 py-4 font-black">Valor</th>
                  <th className="px-6 py-4 font-black">Data</th>
                  <th className="px-6 py-4 font-black text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {commissions.map(c => {
                  const typeConf = TYPE_CONFIG[c.type];
                  return (
                    <tr key={c.id} className="hover:bg-gray-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${typeConf.color}`}>
                          {typeConf.icon} {typeConf.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-bold text-sm">{c.tenant_name || '—'}</p>
                        {c.description && <p className="text-gray-500 text-xs">{c.description}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-black text-lg">R$ {Number(c.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-400 text-sm">{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isSuperAdmin ? (
                          <button
                            onClick={() => handleMarkPaid(c.id, c.paid)}
                            className={`flex items-center gap-2 ml-auto px-4 py-1.5 rounded-xl text-xs font-black border transition-all ${
                              c.paid
                                ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/30'
                            }`}
                          >
                            {c.paid ? <><Check size={12} /> Pago</> : 'Marcar Pago'}
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${c.paid ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                            {c.paid ? <><Check size={10} /> Pago</> : '⏳ Pendente'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Commission Modal (super admin) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-900 border border-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-black text-white">Lançar Comissão</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCommission} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Vendedor</label>
                <select
                  value={newCommission.salesperson_id}
                  onChange={e => setNewCommission({ ...newCommission, salesperson_id: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                  required
                >
                  <option value="">Selecione...</option>
                  {salespersons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['new_client', 'recurring', 'manual'] as const).map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => setNewCommission({ ...newCommission, type: t })}
                      className={`p-2 rounded-xl border text-xs font-black transition-all text-center ${newCommission.type === t ? TYPE_CONFIG[t].color : 'border-gray-700 text-gray-500'}`}
                    >
                      {TYPE_CONFIG[t].icon}<br />{TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Barbearia / Cliente</label>
                <input type="text" value={newCommission.tenant_name} onChange={e => setNewCommission({ ...newCommission, tenant_name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder="Nome da barbearia (opcional)" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Valor (R$)</label>
                <input type="number" step="0.01" min="0" value={newCommission.amount} onChange={e => setNewCommission({ ...newCommission, amount: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder="0,00" required />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Observação (opcional)</label>
                <input type="text" value={newCommission.description} onChange={e => setNewCommission({ ...newCommission, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" placeholder="Ex: Bônus por meta atingida" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl border border-gray-700">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-dark-950 font-black rounded-2xl shadow-lg disabled:opacity-50 uppercase tracking-widest text-sm">
                  {saving ? 'Salvando...' : 'Lançar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesCommissionsPage;
