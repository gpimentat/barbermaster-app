import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Download,
  Filter,
  X,
  Trash2,
  Save,
  Plus,
  Pencil,
  Calendar,
  Loader2
} from 'lucide-react';
import { Transaction, PaymentMethod } from '../types';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

const FinancialPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  // Cálculos Gerais (Totais)
  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  // Lógica de Agregação Mensal
  const monthlyStats = useMemo(() => {
    const stats: Record<string, { label: string; income: number; expense: number; balance: number; sortKey: string }> = {};

    transactions.forEach(t => {
      const date = new Date(t.date);
      // Chave para ordenação (YYYY-MM)
      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      // Label para exibição (Outubro 2023)
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      // Capitalizar primeira letra
      const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);

      if (!stats[sortKey]) {
        stats[sortKey] = { label: formattedLabel, income: 0, expense: 0, balance: 0, sortKey };
      }

      if (t.type === 'income') {
        stats[sortKey].income += t.amount;
      } else {
        stats[sortKey].expense += t.amount;
      }
      stats[sortKey].balance = stats[sortKey].income - stats[sortKey].expense;
    });

    // Converter para array e ordenar do mais recente para o mais antigo
    return Object.values(stats).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [transactions]);

  // --- FETCH TRANSACTIONS ---
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedTransactions: Transaction[] = data.map((t: any) => ({
          id: t.id,
          date: t.date,
          description: t.description || '',
          amount: Number(t.amount) || 0,
          type: t.type as 'income' | 'expense',
          category: t.category || '',
          method: t.method as PaymentMethod
        }));
        setTransactions(mappedTransactions);
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // --- HANDLERS ---
  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction({ ...transaction });
    setIsDeleteConfirming(false);
  };

  const handleNewTransaction = () => {
    setSelectedTransaction({
      id: '', // Empty for new
      description: '',
      amount: 0,
      type: 'income',
      category: 'Serviços',
      date: new Date().toISOString().split('T')[0],
      method: PaymentMethod.PIX
    });
    setIsDeleteConfirming(false);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
    setIsDeleteConfirming(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;

    const dataToSave = {
      description: selectedTransaction.description,
      amount: selectedTransaction.amount,
      type: selectedTransaction.type,
      category: selectedTransaction.category,
      date: selectedTransaction.date,
      method: selectedTransaction.method,
      tenant_id: currentUser?.tenantId
    };

    try {
      if (selectedTransaction.id) {
        // Update
        const { error } = await supabase
          .from('transactions')
          .update(dataToSave)
          .eq('id', selectedTransaction.id);
        if (error) throw error;
        alert('Transação atualizada!');
      } else {
        // Insert
        const { error } = await supabase
          .from('transactions')
          .insert([dataToSave]);
        if (error) throw error;
        alert('Transação registrada!');
      }

      handleCloseModal();
      fetchTransactions();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction || !selectedTransaction.id) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      alert('✅ Transação excluída!');
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert(`❌ Erro ao excluir: ${error.message}`);
    }
  };

  const updateField = (field: keyof Transaction, value: any) => {
    if (selectedTransaction) {
      setSelectedTransaction({ ...selectedTransaction, [field]: value });
    }
  };

  const isEditing = selectedTransaction && transactions.some(t => t.id === selectedTransaction.id);

  return (
    <div className="space-y-6 relative pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Financeiro</h1>
          <p className="text-gray-500 text-sm">Controle de entradas, saídas e movimentações</p>
        </div>
        <div className="grid grid-cols-2 md:flex gap-2 w-full md:w-auto">
          <button
            onClick={handleNewTransaction}
            className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 px-5 py-3 bg-primary-500 text-dark-950 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary-600 active:scale-[0.98] transition-all shadow-xl shadow-primary-500/10"
          >
            <Plus size={18} />
            Nova Transação
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800/80 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-700 transition-all border border-gray-700/50">
            <Filter size={16} />
            Filtrar
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800/80 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-700 transition-all border border-gray-700/50">
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      {/* Cards de Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-dark-900 p-6 rounded-2xl border border-gray-800/50 shadow-xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
            <TrendingUp size={120} />
          </div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-500 font-black text-xs uppercase tracking-widest">Entradas</h3>
            <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500 border border-green-500/20"><TrendingUp size={20} /></div>
          </div>
          <p className="text-4xl font-black text-white tracking-tight">
            <span className="text-sm font-bold text-gray-500 mr-2 text-opacity-50">R$</span>
            {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-dark-900 p-6 rounded-2xl border border-gray-800/50 shadow-xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
            <TrendingDown size={120} />
          </div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-500 font-black text-xs uppercase tracking-widest">Saídas</h3>
            <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20"><TrendingDown size={20} /></div>
          </div>
          <p className="text-4xl font-black text-white tracking-tight">
            <span className="text-sm font-bold text-gray-500 mr-2 text-opacity-50">R$</span>
            {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-dark-900 p-6 rounded-2xl border border-gray-800/50 shadow-xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.1] group-hover:scale-110 transition-transform text-primary-500">
            <DollarSign size={120} />
          </div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-500 font-black text-xs uppercase tracking-widest">Saldo Atual</h3>
            <div className="p-2.5 bg-primary-500/10 rounded-xl text-primary-500 border border-primary-500/20"><DollarSign size={20} /></div>
          </div>
          <p className={`text-4xl font-black tracking-tight ${balance >= 0 ? 'text-primary-500' : 'text-red-500'}`}>
            <span className="text-sm font-bold mr-2 opacity-50">R$</span>
            {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Seção de Resumo Mensal */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
          <Calendar size={14} className="text-primary-500" />
          Desempenho por Período
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {monthlyStats.length > 0 ? (
            monthlyStats.map((stat) => (
              <div key={stat.sortKey} className="bg-dark-900 border border-gray-800/80 rounded-2xl p-5 hover:border-primary-500/30 transition-all shadow-lg hover:shadow-primary-500/5 group">
                <h3 className="text-white font-black text-sm mb-4 border-b border-gray-800 pb-3 group-hover:text-primary-500 transition-colors uppercase tracking-wider">{stat.label}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Entradas</span>
                    <span className="text-green-500 font-black text-sm">+{stat.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Saídas</span>
                    <span className="text-red-400 font-black text-sm">-{stat.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-800 mt-3">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Lucro</span>
                    <span className={`font-black text-base ${stat.balance >= 0 ? 'text-primary-500' : 'text-red-500'}`}>
                      {stat.balance >= 0 ? '+' : ''} {stat.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-10 text-center text-gray-600 border-2 border-dashed border-gray-800 rounded-3xl">
              <Calendar size={40} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold text-sm">Nenhum dado financeiro registrado ainda.</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabela / Card List de Transações */}
      <div className="bg-dark-900 rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-800 bg-dark-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Movimentações</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Histórico completo de transações</p>
          </div>
          <div className="md:hidden">
            <p className="text-[10px] bg-primary-500/10 text-primary-500 px-3 py-1 rounded-full font-black uppercase tracking-widest inline-block border border-primary-500/20">Toque para ver detalhes</p>
          </div>
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-950/50 text-[10px] uppercase font-black tracking-[0.2em] text-gray-500">
              <tr>
                <th className="px-8 py-5">Descrição</th>
                <th className="px-8 py-5">Categoria</th>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Forma</th>
                <th className="px-8 py-5 text-right">Valor</th>
                <th className="px-8 py-5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-600">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="animate-spin text-primary-500" size={40} />
                      <p className="font-black text-xs uppercase tracking-widest">Sincronizando dados...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => handleRowClick(t)}
                  className="hover:bg-primary-500/[0.02] transition-colors cursor-pointer group"
                >
                  <td className="px-8 py-5 font-black text-white group-hover:text-primary-500 transition-colors uppercase text-xs tracking-wide">
                    {t.description}
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-800/50 border border-gray-700 text-gray-400">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-gray-500">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">{t.method || '-'}</td>
                  <td className={`px-8 py-5 text-right font-black text-sm whitespace-nowrap ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Pencil size={18} className="text-gray-700 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Card List) */}
        <div className="md:hidden divide-y divide-gray-800/50">
          {loading ? (
            <div className="p-20 text-center">
              <Loader2 className="animate-spin text-primary-500 mx-auto" size={40} />
              <p className="font-black text-[10px] uppercase tracking-[0.2em] mt-4 text-gray-600">Buscando movimentações...</p>
            </div>
          ) : transactions.map((t) => (
            <div
              key={t.id}
              onClick={() => handleRowClick(t)}
              className="p-5 active:bg-gray-800/40 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${t.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <h4 className="font-black text-white text-sm truncate uppercase tracking-tight">{t.description}</h4>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{t.category}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-800"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                  {t.method && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-800"></span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary-500/70">{t.method}</span>
                    </>
                  )}
                </div>
              </div>
              <div className={`text-right font-black text-sm whitespace-nowrap ${t.type === 'income' ? 'text-green-500' : 'text-red-400'}`}>
                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
          {!loading && transactions.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-gray-600 font-bold text-xs uppercase tracking-widest">Nenhuma transação encontrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição / Criação - Mobile First */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-dark-900 w-full max-w-lg rounded-t-[2.5rem] md:rounded-3xl border-t md:border border-gray-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 md:zoom-in-95 duration-500 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-800 bg-dark-900/50 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  {isEditing ? 'Editar Registro' : 'Novo Registro'}
                </h2>
                <p className="text-[10px] font-bold text-primary-500/70 uppercase tracking-[0.2em] mt-1">Gestão de Caixa</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 -mr-2 text-gray-500 hover:text-white transition-all bg-gray-800/50 rounded-xl"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                {/* Campo Descrição */}
                <div className="group">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Descrição do Lançamento</label>
                  <input
                    type="text"
                    value={selectedTransaction.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700/80 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all"
                    placeholder="Ex: Pagamento Fornecedor"
                    required
                  />
                </div>

                {/* Campos Valor e Data */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Valor (R$)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-4 font-black text-gray-600 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedTransaction.amount || ''}
                        onChange={(e) => updateField('amount', parseFloat(e.target.value))}
                        className="w-full bg-gray-800/50 border border-gray-700/80 rounded-2xl pl-12 pr-5 py-4 text-white font-black text-lg focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all"
                        placeholder="0,00"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Data</label>
                    <input
                      type="date"
                      value={selectedTransaction.date}
                      onChange={(e) => updateField('date', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700/80 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-primary-500 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Campos Tipo e Categoria */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Tipo de Fluxo</label>
                    <select
                      value={selectedTransaction.type}
                      onChange={(e) => updateField('type', e.target.value as 'income' | 'expense')}
                      className={`w-full bg-gray-800/50 border border-gray-700/80 rounded-2xl px-5 py-4 font-black uppercase tracking-wider text-xs focus:outline-none focus:border-primary-500 transition-all appearance-none cursor-pointer ${selectedTransaction.type === 'income' ? 'text-green-500' : 'text-red-400'}`}
                    >
                      <option value="income">Entrada (+)</option>
                      <option value="expense">Saída (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                    <input
                      type="text"
                      value={selectedTransaction.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700/80 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-primary-500 transition-all text-sm uppercase tracking-wider"
                      placeholder="Serviços"
                      list="categories"
                    />
                  </div>
                </div>

                {/* Campo Método de Pagamento */}
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Método de Lançamento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.values(PaymentMethod).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => updateField('method', method)}
                        className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedTransaction.method === method ? 'bg-primary-500 border-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'bg-gray-800/40 border-gray-700 text-gray-500 hover:border-gray-600'}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rodapé do Modal com Ações - Adaptive */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-gray-800">
                <div className="w-full sm:w-auto">
                  {isEditing && (
                    isDeleteConfirming ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in w-full">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest mr-2 shrink-0">Confirmar?</span>
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <button
                            type="button"
                            onClick={handleDelete}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-95"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsDeleteConfirming(false)}
                            className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                          >
                            Não
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeleteConfirming(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-red-500/10 border border-red-500/10 text-red-500 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 size={18} />
                        Excluir Registro
                      </button>
                    )
                  )}
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 sm:flex-none px-6 py-4 text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                  >
                    Sair
                  </button>
                  {!isDeleteConfirming && (
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-10 py-4 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-dark-950 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-primary-500/10"
                    >
                      <Save size={18} />
                      {isEditing ? 'Salvar' : 'Registrar'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialPage;