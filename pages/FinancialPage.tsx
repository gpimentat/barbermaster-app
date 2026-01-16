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
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-white">Financeiro</h1>
        <div className="flex gap-2">
          <button
            onClick={handleNewTransaction}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-dark-950 font-bold rounded-lg hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20"
          >
            <Plus size={20} />
            Nova Transação
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <Filter size={18} />
            Filtrar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <Download size={18} />
            Exportar
          </button>
        </div>
      </div>

      {/* Cards de Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-900 p-6 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-400 font-medium">Entradas Totais</h3>
            <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><TrendingUp size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-white">R$ {income.toFixed(2)}</p>
        </div>
        <div className="bg-dark-900 p-6 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-400 font-medium">Saídas Totais</h3>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><TrendingDown size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-white">R$ {expense.toFixed(2)}</p>
        </div>
        <div className="bg-dark-900 p-6 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-400 font-medium">Saldo Geral</h3>
            <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500"><DollarSign size={20} /></div>
          </div>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-primary-500' : 'text-red-500'}`}>
            R$ {balance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Seção de Resumo Mensal */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar size={20} className="text-primary-500" />
          Resumo Mensal
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {monthlyStats.length > 0 ? (
            monthlyStats.map((stat) => (
              <div key={stat.sortKey} className="bg-dark-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                <h3 className="text-white font-bold mb-3 border-b border-gray-800 pb-2">{stat.label}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entradas</span>
                    <span className="text-green-500 font-medium">+ {stat.income.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Saídas</span>
                    <span className="text-red-500 font-medium">- {stat.expense.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-800 mt-2">
                    <span className="text-gray-400 font-medium">Saldo</span>
                    <span className={`font-bold ${stat.balance >= 0 ? 'text-primary-500' : 'text-red-500'}`}>
                      {stat.balance >= 0 ? '+' : ''} {stat.balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-6 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
              Nenhum dado financeiro para exibir resumos.
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Todas as Movimentações</h2>
          <p className="text-sm text-gray-500 mt-1">Clique em uma transação para editar os detalhes.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-gray-400">
            <thead className="bg-gray-900/50 text-xs uppercase font-semibold text-gray-500">
              <tr>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-primary-500" size={32} />
                      <p>Buscando movimentações...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => handleRowClick(t)}
                  className="hover:bg-gray-800/30 transition-colors cursor-pointer group"
                  title="Clique para editar"
                >
                  <td className="px-6 py-4 font-medium text-white group-hover:text-primary-400 transition-colors">
                    {t.description}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-800 border border-gray-700">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">{t.method || '-'}</td>
                  <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Pencil size={16} className="text-gray-600 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all" />
                  </td>
                </tr>
              ))}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição / Criação */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Editar Transação' : 'Nova Transação'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Campo Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={selectedTransaction.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Ex: Corte de Cabelo"
                  required
                />
              </div>

              {/* Campos Valor e Data */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedTransaction.amount || ''}
                    onChange={(e) => updateField('amount', parseFloat(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Data</label>
                  <input
                    type="date"
                    value={selectedTransaction.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              {/* Campos Tipo e Categoria */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Tipo</label>
                  <select
                    value={selectedTransaction.type}
                    onChange={(e) => updateField('type', e.target.value as 'income' | 'expense')}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="income">Entrada (+)</option>
                    <option value="expense">Saída (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={selectedTransaction.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    placeholder="Ex: Serviços"
                    list="categories"
                  />
                  <datalist id="categories">
                    <option value="Serviços" />
                    <option value="Insumos" />
                    <option value="Salários" />
                    <option value="Aluguel" />
                    <option value="Utilidades" />
                  </datalist>
                </div>
              </div>

              {/* Campo Método de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Método de Pagamento</label>
                <select
                  value={selectedTransaction.method || ''}
                  onChange={(e) => updateField('method', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">Selecione...</option>
                  {Object.values(PaymentMethod).map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              {/* Rodapé do Modal com Ações */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-800">
                <div>
                  {isEditing && (
                    isDeleteConfirming ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in">
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg"
                        >
                          SIM, APAGAR
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDeleteConfirming(false)}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeleteConfirming(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 rounded-lg transition-all"
                      >
                        <Trash2 size={20} />
                        <span>Excluir</span>
                      </button>
                    )
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors shadow-lg shadow-primary-500/10"
                  >
                    <Save size={20} />
                    <span>{isEditing ? 'Salvar Alterações' : 'Adicionar Transação'}</span>
                  </button>
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