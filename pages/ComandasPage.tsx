
import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  User,
  ShoppingBag,
  Scissors,
  Trash2,
  Check,
  Clock,
  X,
  CreditCard,
  DollarSign,
  Filter,
  CalendarCheck,
  Gift,
  Loader2,
  Ban
} from 'lucide-react';
import { Comanda, ComandaItem, Client, Service, Product, Barber, PaymentMethod, Transaction } from '../types';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

const ComandasPage: React.FC = () => {
  const { currentUser, role } = useAuth();
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Database Data States
  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [dbBarbers, setDbBarbers] = useState<Barber[]>([]);
  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);

  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);

  // States for Modal Form
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [searchClient, setSearchClient] = useState('');

  // Selection states for adding items
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState('');

  // Product Selection States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('');
  const [productQty, setProductQty] = useState(1);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Comandas
      const { data: comandasData } = await supabase
        .from('comandas')
        .select('*, comanda_items (*)')
        .order('open_date', { ascending: false });

      // 2. Fetch Supporting Data
      const [
        { data: clientsData },
        { data: profilesData },
        { data: servicesData },
        { data: productsData }
      ] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('services').select('*'),
        supabase.from('products').select('*')
      ]);

      const mappedComandas: Comanda[] = (comandasData || []).map(c => ({
        id: c.id,
        clientId: c.client_id,
        clientName: c.client_name,
        status: c.status as any,
        openDate: c.open_date,
        closeDate: c.close_date,
        total: Number(c.total),
        paymentMethod: c.payment_method as any,
        items: (c.comanda_items || []).map((item: any) => ({
          id: item.id,
          type: item.type as any,
          itemId: item.item_id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          barberId: item.barber_id
        }))
      }));

      setComandas(mappedComandas);
      setDbClients(clientsData || []);
      setDbBarbers((profilesData || []).map(b => ({
        id: b.id,
        name: b.name,
        email: b.email,
        role: b.role,
        avatar: b.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=random`,
        active: b.active,
        commissionRate: Number(b.commission_rate) || 0
      })));
      setDbServices((servicesData || []).map(s => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        durationMinutes: s.duration_minutes,
        description: s.description || '',
        chips: Number(s.chips) || 0,
        loyaltyPoints: s.loyalty_points ?? undefined
      })));
      setDbProducts((productsData || []).map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        costPrice: Number(p.cost_price),
        stock: p.stock,
        minStock: p.min_stock,
        category: p.category,
        image: p.image,
        description: p.description
      })));

    } catch (error) {
      console.error('Erro ao buscar comandas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- DERIVED DATA ---
  const openComandas = comandas.filter(c => c.status === 'open');
  const historyComandas = comandas.filter(c => c.status !== 'open');
  const isReadOnly = selectedComanda?.status === 'paid' || selectedComanda?.status === 'canceled';

  const productCategories = useMemo(() => {
    return Array.from(new Set(dbProducts.map(p => p.category))).sort();
  }, [dbProducts]);

  const filteredProducts = useMemo(() => {
    return dbProducts.filter(p =>
      p.stock > 0 &&
      (selectedProductCategory === '' || p.category === selectedProductCategory)
    );
  }, [dbProducts, selectedProductCategory]);

  const handleNewComanda = () => {
    const tempId = `temp-${Date.now()}`;
    setSelectedComanda({
      id: tempId,
      clientId: '',
      clientName: '',
      items: [],
      total: 0,
      status: 'open',
      openDate: new Date().toISOString()
    });
    setSearchClient('');
    setPaymentMethod(PaymentMethod.PIX);
    setSelectedProductCategory('');
  };

  const handleSelectClient = (client: Client) => {
    if (selectedComanda) {
      setSelectedComanda({
        ...selectedComanda,
        clientId: client.id,
        clientName: client.name
      });
      setSearchClient(''); // Clear search after selection to hide dropdown
    }
  };

  const handleAddService = () => {
    if (!selectedComanda || !selectedServiceId || !selectedBarberId) return;

    const service = dbServices.find(s => s.id === selectedServiceId);
    if (!service) return;

    const newItem: ComandaItem = {
      id: `new-${Date.now()}`,
      type: 'service',
      itemId: service.id,
      name: service.name,
      price: service.price,
      quantity: 1,
      barberId: selectedBarberId
    };

    updateComandaItems([...selectedComanda.items, newItem]);
    setSelectedServiceId('');
  };

  const handleAddProduct = () => {
    if (!selectedComanda || !selectedProductId) return;

    const product = dbProducts.find(p => p.id === selectedProductId);
    if (!product) return;

    const newItem: ComandaItem = {
      id: `new-${Date.now()}-${Math.random()}`,
      type: 'product',
      itemId: product.id,
      name: product.name,
      price: product.price,
      quantity: productQty
    };

    updateComandaItems([...selectedComanda.items, newItem]);
    setSelectedProductId('');
    setProductQty(1);
  };

  const handleRemoveItem = (itemId: string) => {
    if (selectedComanda && !isReadOnly) {
      const newItems = selectedComanda.items.filter(i => i.id !== itemId);
      updateComandaItems(newItems);
    }
  };

  const updateComandaItems = (items: ComandaItem[]) => {
    if (selectedComanda) {
      const newTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      setSelectedComanda({
        ...selectedComanda,
        items,
        total: newTotal
      });
    }
  };

  const handleSaveComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComanda || !selectedComanda.clientId) {
      alert('Selecione um cliente para a comanda.');
      return;
    }

    try {
      setIsSubmitting(true);

      const isNew = selectedComanda.id.startsWith('temp-');
      let comandaId = selectedComanda.id;

      const comandaData = {
        client_id: selectedComanda.clientId,
        client_name: selectedComanda.clientName,
        total: selectedComanda.total,
        status: 'open',
        open_date: selectedComanda.openDate,
        tenant_id: currentUser?.tenantId
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('comandas')
          .insert([comandaData])
          .select()
          .single();
        if (error) throw error;
        comandaId = data.id;
      } else {
        const { error } = await supabase
          .from('comandas')
          .update(comandaData)
          .eq('id', comandaId);
        if (error) throw error;
      }

      // Sync Items
      // 1. Delete old items
      if (!isNew) {
        await supabase.from('comanda_items').delete().eq('comanda_id', comandaId);
      }

      // 2. Insert current items
      if (selectedComanda.items.length > 0) {
        const itemsToInsert = selectedComanda.items.map(item => ({
          comanda_id: comandaId,
          type: item.type,
          item_id: item.itemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          barber_id: item.barberId,
          tenant_id: currentUser?.tenantId
        }));

        const { error: itemsError } = await supabase
          .from('comanda_items')
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      alert('Comanda salva com sucesso!');
      setSelectedComanda(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar comanda:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedComanda) return;

    try {
      setIsSubmitting(true);

      // 1. Check Stock
      const itemsWithStockIssues: string[] = [];
      selectedComanda.items.forEach(item => {
        if (item.type === 'product') {
          const product = dbProducts.find(p => p.id === item.itemId);
          if (product && product.stock < item.quantity) {
            itemsWithStockIssues.push(`${product.name} (Disp: ${product.stock}, Pedido: ${item.quantity})`);
          }
        }
      });

      if (itemsWithStockIssues.length > 0) {
        alert(`Erro ao finalizar: Estoque insuficiente para:\n${itemsWithStockIssues.join('\n')}`);
        return;
      }

      // 2. Persist Comanda and Items if needed (ensure we have a real ID)
      const isNew = selectedComanda.id.startsWith('temp-');
      let comandaId = selectedComanda.id;

      const comandaHeader = {
        client_id: selectedComanda.clientId,
        client_name: selectedComanda.clientName,
        total: selectedComanda.total,
        status: 'paid',
        close_date: new Date().toISOString(),
        payment_method: paymentMethod,
        tenant_id: currentUser?.tenantId
      };

      if (isNew) {
        const { data, error } = await supabase.from('comandas').insert([comandaHeader]).select().single();
        if (error) throw error;
        comandaId = data.id;
      } else {
        const { error } = await supabase.from('comandas').update(comandaHeader).eq('id', comandaId);
        if (error) throw error;
      }

      // Sync items if it was an existing open comanda
      if (!isNew) {
        await supabase.from('comanda_items').delete().eq('comanda_id', comandaId);
      }

      const itemsToInsert = selectedComanda.items.map(item => ({
        comanda_id: comandaId,
        type: item.type,
        item_id: item.itemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        barber_id: item.barberId,
        tenant_id: currentUser?.tenantId
      }));
      const { error: itemsError } = await supabase.from('comanda_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // 3. Update Stock & Generate transactions & Update points (Parallel)
      const stockUpdates = selectedComanda.items
        .filter(i => i.type === 'product')
        .map(item => {
          const prod = dbProducts.find(p => p.id === item.itemId);
          return supabase
            .from('products')
            .update({ stock: (prod?.stock || 0) - item.quantity })
            .eq('id', item.itemId);
        });

      // Financial Transactions (Income)
      const incomeTransactions = selectedComanda.items.map(item => ({
        date: new Date().toISOString().split('T')[0],
        description: `${item.type === 'service' ? 'Serviço' : 'Venda'}: ${item.name} (${selectedComanda.clientName})`,
        amount: item.price * item.quantity,
        type: 'income',
        category: item.type === 'service' ? 'Serviços' : 'Venda de Produtos',
        method: paymentMethod,
        tenant_id: currentUser?.tenantId
      }));

      // Commission Transactions (Expense)
      const commissionTransactions: any[] = [];
      selectedComanda.items.forEach(item => {
        if (item.type === 'service' && item.barberId) {
          const barber = dbBarbers.find(b => b.id === item.barberId);
          if (barber && barber.commissionRate > 0) {
            commissionTransactions.push({
              date: new Date().toISOString().split('T')[0],
              description: `Comissão: ${barber.name} - ${item.name}`,
              amount: (item.price * item.quantity) * (barber.commissionRate / 100),
              type: 'expense',
              category: 'Comissões',
              method: paymentMethod, // Optional: method of the original pay
              tenant_id: currentUser?.tenantId
            });
          }
        }
      });

      const txInsertions = supabase.from('transactions').insert([...incomeTransactions, ...commissionTransactions]);

      // Loyalty Points - Use custom points if defined, otherwise use price
      let pointsPromise: Promise<any> = Promise.resolve();
      const earnedPoints = selectedComanda.items
        .filter(item => item.type === 'service')
        .reduce((acc, item) => {
          const service = dbServices.find(s => s.id === item.itemId);
          const pointsPerService = service?.loyaltyPoints ?? Math.floor(item.price);
          return acc + (pointsPerService * item.quantity);
        }, 0);

      if (earnedPoints > 0) {
        const client = dbClients.find(c => c.id === selectedComanda.clientId);
        pointsPromise = (supabase
          .from('clients')
          .update({ loyalty_points: (client?.loyaltyPoints || 0) + earnedPoints })
          .eq('id', selectedComanda.clientId) as any);
      }

      await Promise.all([...stockUpdates, txInsertions, pointsPromise]);

      alert(`Comanda finalizada com sucesso!
        
- Estoque atualizado.
- ${incomeTransactions.length} vendas registradas.
- ${commissionTransactions.length} comissões geradas no Financeiro.
- ${earnedPoints > 0 ? `Cliente ganhou +${earnedPoints} pontos!` : ''}`);

      setSelectedComanda(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao finalizar comanda:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComanda = async () => {
    if (!selectedComanda) return;

    // Permission Check: Admin or Super Admin
    if (!['admin', 'super_admin'].includes(role)) {
      alert('Você não tem permissão para excluir comandas permanentemente.');
      return;
    }

    if (!window.confirm('TEM CERTEZA? Isso excluirá a comanda e todos os itens permanentemente. Use "Cancelar" se quiser apenas invalidar. Continuar com Exclusão?')) {
      return;
    }

    try {
      setIsSubmitting(true);

      const { error: itemsError } = await supabase.from('comanda_items').delete().eq('comanda_id', selectedComanda.id);
      if (itemsError) throw itemsError;

      const { error: comandaError } = await supabase.from('comandas').delete().eq('id', selectedComanda.id);
      if (comandaError) throw comandaError;

      alert('Comanda excluída permanentemente.');
      setSelectedComanda(null);
      fetchData();

    } catch (error: any) {
      console.error('Erro ao excluir comanda:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelComanda = async () => {
    if (!selectedComanda) return;

    // Permission Check: Admin, Super Admin, or Receptionist
    if (!['admin', 'super_admin', 'receptionist'].includes(role)) {
      alert('Você não tem permissão para cancelar comandas.');
      return;
    }

    const reason = prompt("Motivo do cancelamento (Opcional):");
    if (reason === null) return; // Cancelled prompt

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('comandas')
        .update({
          status: 'canceled',
          close_date: new Date().toISOString()
          // removed notes update to avoid schema issues, can add if 'notes' column exists
        })
        .eq('id', selectedComanda.id);

      if (error) throw error;

      alert('Comanda cancelada com sucesso.');
      setSelectedComanda(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao cancelar:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBarberName = (id?: string) => dbBarbers.find(b => b.id === id)?.name || 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Comandas</h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-400">Gerencie atendimentos e vendas em aberto.</p>
            <span className="text-[10px] bg-gray-800 text-gray-500 px-1 rounded border border-gray-700">{role}</span>
          </div>
        </div>
        <button
          onClick={handleNewComanda}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-primary-500/20"
        >
          <Plus size={20} />
          Nova Comanda
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna: Comandas em Aberto */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} className="text-primary-500" />
            <h2 className="text-xl font-bold text-white">Em Aberto</h2>
            <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full">{openComandas.length}</span>
            {loading && <Loader2 className="animate-spin text-primary-500 ml-2" size={16} />}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {openComandas.map(comanda => (
              <div
                key={comanda.id}
                onClick={() => setSelectedComanda({ ...comanda })}
                className="bg-dark-900 border border-gray-800 p-5 rounded-xl hover:border-primary-500/50 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-primary-500">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{comanda.clientName}</h3>
                      <p className="text-xs text-gray-500">Aberta às {new Date(comanda.openDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-500">R$ {comanda.total.toFixed(2)}</p>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Em andamento</span>
                  </div>
                </div>

                <div className="space-y-1">
                  {comanda.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-400">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  {comanda.items.length > 3 && (
                    <p className="text-xs text-gray-500 italic mt-1">+ {comanda.items.length - 3} itens...</p>
                  )}
                </div>
              </div>
            ))}
            {openComandas.length === 0 && (
              <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center text-gray-500">
                Nenhuma comanda aberta no momento.
              </div>
            )}
          </div>
        </div>

        {/* Coluna: Histórico Recente */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Check size={20} className="text-green-500" />
            <h2 className="text-xl font-bold text-white">Finalizadas / Histórico</h2>
          </div>

          <div className="bg-dark-900 border border-gray-800 rounded-xl overflow-hidden">
            {historyComandas.length > 0 ? (
              <div className="divide-y divide-gray-800">
                {historyComandas.map(comanda => (
                  <div
                    key={comanda.id}
                    onClick={() => setSelectedComanda({ ...comanda })}
                    className="p-4 flex justify-between items-center hover:bg-gray-800/30 transition-colors cursor-pointer group"
                  >
                    <div>
                      <p className="font-medium text-white group-hover:text-primary-400 transition-colors">{comanda.clientName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(comanda.openDate).toLocaleDateString()} • {comanda.items.length} itens
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-500">R$ {comanda.total.toFixed(2)}</p>
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] text-gray-500 uppercase">{comanda.status === 'paid' ? 'Pago' : 'Cancelado'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Nenhum histórico recente.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nova/Editar/Visualizar Comanda */}
      {selectedComanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">
                    {isReadOnly ? `Detalhes da Comanda` : (selectedComanda.clientName ? `Comanda: ${selectedComanda.clientName}` : 'Nova Comanda')}
                  </h2>
                  {isReadOnly && (
                    <span className="bg-green-500/10 text-green-500 text-xs px-2 py-0.5 rounded border border-green-500/20 uppercase font-bold">
                      {selectedComanda.status === 'paid' ? 'Finalizada' : 'Cancelada'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">ID: {selectedComanda.id}</p>
              </div>
              <div className="flex gap-2">
                {/* Botão Cancelar (Status = Canceled) */}
                {['admin', 'super_admin', 'receptionist'].includes(role) && !isReadOnly && (
                  <button
                    onClick={handleCancelComanda}
                    className="text-orange-500 hover:text-orange-400 p-2 hover:bg-orange-500/10 rounded-lg transition-colors"
                    title="Cancelar Comanda (Manter Histórico)"
                  >
                    <Ban size={20} />
                  </button>
                )}

                {/* Botão Excluir (Delete Record) */}
                {['admin', 'super_admin'].includes(role) && (
                  <button
                    onClick={handleDeleteComanda}
                    className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                    title="Excluir Permanentemente"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button onClick={() => setSelectedComanda(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Lado Esquerdo: Adição de Itens */}
              <div className="w-full md:w-1/2 p-6 border-r border-gray-800 overflow-y-auto bg-gray-800/20">
                {isReadOnly ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-2">
                      <Check size={48} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{selectedComanda.clientName}</h3>
                      <p className="text-gray-400 text-sm">Cliente Atendido</p>
                    </div>

                    <div className="w-full bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500 uppercase">Pontos Ganhos (Serviços)</span>
                        <div className="flex items-center gap-1 text-primary-500 font-bold">
                          <Gift size={14} />
                          {/* Calcula pontos apenas para serviços para exibição */}
                          {Math.floor(selectedComanda.items.filter(i => i.type === 'service').reduce((acc, i) => acc + (i.price * i.quantity), 0))} pts
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 text-left pt-2 border-t border-gray-700/50">
                        Essa comanda já foi processada, o estoque foi atualizado e os pontos de fidelidade creditados.
                      </div>
                    </div>
                  </div>
                ) : (
                  // MODO EDIÇÃO (Conteúdo mantido)
                  <>
                    {/* Seleção de Cliente (se novo) */}
                    {!selectedComanda.clientName && (
                      <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Buscar Cliente</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                          <input
                            type="text"
                            value={searchClient}
                            onChange={(e) => setSearchClient(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-primary-500 focus:outline-none"
                            placeholder="Digite o nome..."
                          />
                          {searchClient && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                              {dbClients
                                .filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase()))
                                .map(client => (
                                  <button
                                    key={client.id}
                                    onClick={() => handleSelectClient(client)}
                                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-0"
                                  >
                                    {client.name}
                                  </button>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tabs Produtos/Serviços */}
                    {selectedComanda.clientId && (
                      <>
                        <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
                          <button
                            onClick={() => setActiveTab('services')}
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'services' ? 'bg-dark-900 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                          >
                            <Scissors size={16} /> Serviços
                          </button>
                          <button
                            onClick={() => setActiveTab('products')}
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'products' ? 'bg-dark-900 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                          >
                            <ShoppingBag size={16} /> Produtos
                          </button>
                        </div>

                        <div className="space-y-4">
                          {activeTab === 'services' ? (
                            <div className="space-y-4 animate-in fade-in duration-200">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Serviço</label>
                                <select
                                  value={selectedServiceId}
                                  onChange={(e) => setSelectedServiceId(e.target.value)}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
                                >
                                  <option value="">Selecione...</option>
                                  {dbServices.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Profissional</label>
                                <select
                                  value={selectedBarberId}
                                  onChange={(e) => setSelectedBarberId(e.target.value)}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
                                >
                                  <option value="">Selecione...</option>
                                  {dbBarbers.filter(b => b.active).map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                onClick={handleAddService}
                                disabled={!selectedServiceId || !selectedBarberId}
                                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-dark-950 font-bold py-2.5 rounded-lg transition-colors mt-2"
                              >
                                Adicionar Serviço
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4 animate-in fade-in duration-200">
                              {/* Filtro de Categoria de Produtos */}
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Categoria</label>
                                <div className="flex gap-2 mb-2 overflow-x-auto pb-2 no-scrollbar">
                                  <button
                                    onClick={() => { setSelectedProductCategory(''); setSelectedProductId(''); }}
                                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors border ${selectedProductCategory === ''
                                      ? 'bg-primary-500 border-primary-500 text-dark-950 font-bold'
                                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                                      }`}
                                  >
                                    Todos
                                  </button>
                                  {productCategories.map(cat => (
                                    <button
                                      key={cat}
                                      onClick={() => { setSelectedProductCategory(cat); setSelectedProductId(''); }}
                                      className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors border ${selectedProductCategory === cat
                                        ? 'bg-primary-500 border-primary-500 text-dark-950 font-bold'
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Produto</label>
                                <select
                                  value={selectedProductId}
                                  onChange={(e) => setSelectedProductId(e.target.value)}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
                                >
                                  <option value="">
                                    {filteredProducts.length === 0 ? '-- Nenhum produto nesta categoria --' : 'Selecione...'}
                                  </option>
                                  {filteredProducts.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Quantidade</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={productQty}
                                  onChange={(e) => setProductQty(parseInt(e.target.value))}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
                                />
                              </div>
                              <button
                                onClick={handleAddProduct}
                                disabled={!selectedProductId}
                                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-dark-950 font-bold py-2.5 rounded-lg transition-colors mt-2"
                              >
                                Adicionar Produto
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Lado Direito: Resumo da Comanda */}
              <div className="w-full md:w-1/2 flex flex-col bg-gray-900/30">
                <div className="flex-1 p-6 overflow-y-auto">
                  <h3 className="text-gray-400 font-medium mb-4 flex items-center gap-2">
                    <ClipboardList size={18} /> Resumo do Pedido
                  </h3>

                  {selectedComanda.items.length === 0 ? (
                    <div className="text-center text-gray-600 py-10 italic">
                      Nenhum item adicionado ainda.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedComanda.items.map((item) => (
                        <div key={item.id} className={`flex justify-between items-center bg-dark-900 p-3 rounded-lg border ${isReadOnly ? 'border-gray-800/50 opacity-80' : 'border-gray-800'}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${item.type === 'service' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                              <p className="text-white font-medium">{item.name}</p>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 pl-4">
                              {item.quantity}x R$ {item.price.toFixed(2)}
                              {item.barberId && ` • Prof: ${getBarberName(item.barberId)}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-white font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            {!isReadOnly && (
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-gray-600 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Totais e Ações */}
                <div className="p-6 border-t border-gray-800 bg-dark-900">

                  {!isReadOnly ? (
                    <>
                      {/* Seletor de Pagamento (Apenas se aberta) */}
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Forma de Pagamento</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.values(PaymentMethod).map(method => (
                            <button
                              key={method}
                              onClick={() => setPaymentMethod(method)}
                              className={`px-2 py-3 text-xs rounded-lg border transition-all flex flex-col items-center gap-1 justify-center h-16 ${paymentMethod === method
                                ? 'bg-primary-500/20 border-primary-500 text-primary-500 font-bold'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                              {method === PaymentMethod.PIX && <div className="text-[10px] font-bold">PIX</div>}
                              {method === PaymentMethod.CREDIT_CARD && <CreditCard size={16} />}
                              {method === PaymentMethod.DEBIT_CARD && <CreditCard size={16} className="opacity-70" />}
                              {method === PaymentMethod.CASH && <DollarSign size={16} />}
                              <span>{method}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-end mb-6 pt-4 border-t border-gray-800">
                        <span className="text-gray-400">Total a Pagar</span>
                        <span className="text-3xl font-bold text-primary-500">R$ {selectedComanda.total.toFixed(2)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleSaveComanda}
                          disabled={isSubmitting}
                          className="px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2"
                        >
                          {isSubmitting && activeTab === 'services' && <Loader2 size={16} className="animate-spin" />}
                          Salvar Aberta
                        </button>
                        <button
                          onClick={handleFinalize}
                          disabled={selectedComanda.items.length === 0 || isSubmitting}
                          className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
                        >
                          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                          Finalizar & Pagar
                        </button>
                      </div>
                    </>
                  ) : (
                    // Footer de Comanda Finalizada (Read Only)
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg border border-gray-800">
                        <span className="text-gray-400 font-medium">Método de Pagamento</span>
                        <span className="text-white font-bold flex items-center gap-2">
                          {selectedComanda.paymentMethod === PaymentMethod.PIX && <div className="text-[10px] font-bold bg-primary-500 text-dark-950 px-1 rounded">PIX</div>}
                          {selectedComanda.paymentMethod === PaymentMethod.CREDIT_CARD && <CreditCard size={16} />}
                          {selectedComanda.paymentMethod === PaymentMethod.DEBIT_CARD && <CreditCard size={16} className="opacity-70" />}
                          {selectedComanda.paymentMethod === PaymentMethod.CASH && <DollarSign size={16} />}
                          {selectedComanda.paymentMethod || 'Não informado'}
                        </span>
                      </div>

                      <div className="flex justify-between items-end pt-2">
                        <span className="text-gray-400">Total Pago</span>
                        <span className="text-3xl font-bold text-green-500">R$ {selectedComanda.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComandasPage;
