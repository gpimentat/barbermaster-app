
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
  Ban,
  Save
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

  // Discount Modal States
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');


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
        discountAmount: Number(c.discount_amount) || 0,
        discountReason: c.discount_reason,
        discountAppliedBy: c.discount_applied_by,
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

  const handleApplyDiscount = async () => {
    if (!selectedComanda) return;

    // Validation for receptionist
    if (role === 'receptionist' && !discountReason.trim()) {
      alert('Recepcionistas devem informar o motivo do desconto.');
      return;
    }

    // Apply discount
    const itemsTotal = selectedComanda.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const finalTotal = Math.max(0, itemsTotal - discountAmount);

    setSelectedComanda({
      ...selectedComanda,
      discountAmount,
      discountReason: discountReason.trim() || undefined,
      discountAppliedBy: currentUser?.id,
      total: finalTotal
    });

    // Send notification to admins if receptionist applied discount
    if (role === 'receptionist' && discountAmount > 0) {
      try {
        // Fetch all admins from this tenant
        const { data: admins } = await supabase
          .from('staff')
          .select('id')
          .eq('tenant_id', currentUser?.tenantId)
          .in('role', ['admin', 'super_admin']);

        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            user_id: admin.id,
            title: 'Desconto Aplicado',
            message: `${currentUser?.name} aplicou R$ ${discountAmount.toFixed(2)} de desconto na comanda de ${selectedComanda.clientName}. Motivo: ${discountReason.trim()}`,
            type: 'warning',
            tenant_id: currentUser?.tenantId
          }));

          await supabase.from('notifications').insert(notifications);

          // Invoke real push notification
          await supabase.functions.invoke('send-push-secured-v1', {
            body: {
              user_ids: admins.map(a => a.id),
              title: 'Desconto Aplicado',
              message: `${currentUser?.name} aplicou R$ ${discountAmount.toFixed(2)} de desconto em ${selectedComanda.clientName}.`,
              url: '/comandas'
            }
          });
        }
      } catch (error) {
        console.error('Erro ao criar notificações:', error);
      }
    }

    setShowDiscountModal(false);
    setDiscountAmount(0);
    setDiscountReason('');
  };

  const handleOpenDiscountModal = () => {
    if (!selectedComanda) return;
    setDiscountAmount(selectedComanda.discountAmount || 0);
    setDiscountReason(selectedComanda.discountReason || '');
    setShowDiscountModal(true);
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
        discount_amount: selectedComanda.discountAmount || 0,
        discount_reason: selectedComanda.discountReason,
        discount_applied_by: selectedComanda.discountAppliedBy,
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
        discount_amount: selectedComanda.discountAmount || 0,
        discount_reason: selectedComanda.discountReason,
        discount_applied_by: selectedComanda.discountAppliedBy,
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

      // Commission Transactions (Expense) - Apply discount proportionally
      const commissionTransactions: any[] = [];
      const itemsTotal = selectedComanda.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const discountRatio = itemsTotal > 0 ? (selectedComanda.total / itemsTotal) : 1;

      selectedComanda.items.forEach(item => {
        if (item.type === 'service' && item.barberId) {
          const barber = dbBarbers.find(b => b.id === item.barberId);
          if (barber && barber.commissionRate > 0) {
            const itemValue = item.price * item.quantity;
            const discountedItemValue = itemValue * discountRatio;
            commissionTransactions.push({
              date: new Date().toISOString().split('T')[0],
              description: `Comissão: ${barber.name} - ${item.name}`,
              amount: discountedItemValue * (barber.commissionRate / 100),
              type: 'expense',
              category: 'Comissões',
              method: paymentMethod,
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
    <div className="space-y-6 relative pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Comandas</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 text-sm">Controle de atendimentos e PDV</p>
            <span className="text-[10px] bg-primary-500/10 text-primary-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-primary-500/20">{role}</span>
          </div>
        </div>
        <button
          onClick={handleNewComanda}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-dark-950 px-6 py-3 rounded-xl font-black transition-all shadow-xl shadow-primary-500/10"
        >
          <Plus size={20} />
          Nova Comanda
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna: Comandas em Aberto */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-xl text-primary-500">
                <Clock size={20} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Em Aberto</h2>
            </div>
            <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full font-black">{openComandas.length}</span>
            {loading && <Loader2 className="animate-spin text-primary-500 ml-2" size={16} />}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {openComandas.map(comanda => (
              <div
                key={comanda.id}
                onClick={() => setSelectedComanda({ ...comanda })}
                className="bg-dark-900 border border-gray-800/80 p-6 rounded-2xl hover:border-primary-500/50 cursor-pointer transition-all group relative overflow-hidden active:scale-[0.99]"
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                  <ClipboardList size={100} />
                </div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center text-primary-500 border border-gray-700/50 group-hover:bg-primary-500 group-hover:text-dark-950 transition-colors duration-300">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white group-hover:text-primary-500 transition-colors uppercase tracking-tight">{comanda.clientName}</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                        Início às {new Date(comanda.openDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary-500 tracking-tighter">
                      <span className="text-[10px] opacity-50 mr-1">R$</span>
                      {comanda.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest bg-gray-800/50 px-2 py-1 rounded-lg border border-gray-700/50">Ativo</span>
                  </div>
                </div>

                <div className="space-y-2 relative z-10 pt-4 border-t border-gray-800/50">
                  {comanda.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs font-bold text-gray-400">
                      <span className="truncate pr-4 uppercase tracking-tighter">{item.quantity}x {item.name}</span>
                      <span className="shrink-0 text-white">R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  {comanda.items.length > 3 && (
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">+ {comanda.items.length - 3} itens no carrinho</p>
                  )}
                </div>
              </div>
            ))}
            {openComandas.length === 0 && (
              <div className="p-12 border-2 border-dashed border-gray-800 rounded-3xl text-center">
                <ClipboardList size={40} className="mx-auto mb-4 text-gray-700 opacity-20" />
                <p className="text-gray-600 font-black text-sm uppercase tracking-widest">Nenhuma comanda aberta</p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna: Histórico Recente */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
            <div className="p-2 bg-green-500/10 rounded-xl text-green-500">
              <Check size={20} />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Histórico Recente</h2>
          </div>

          <div className="bg-dark-900 border border-gray-800/80 rounded-3xl overflow-hidden shadow-2xl">
            {historyComandas.length > 0 ? (
              <div className="divide-y divide-gray-800/50">
                {historyComandas.map(comanda => (
                  <div
                    key={comanda.id}
                    onClick={() => setSelectedComanda({ ...comanda })}
                    className="p-5 flex justify-between items-center hover:bg-primary-500/[0.02] transition-colors cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-black text-white group-hover:text-primary-500 transition-colors uppercase text-sm tracking-tight truncate">{comanda.clientName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{new Date(comanda.openDate).toLocaleDateString()}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-800"></span>
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none">{comanda.items.length} itens</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-black text-base ${comanda.status === 'paid' ? 'text-green-500' : 'text-red-500/50'}`}>
                        R$ {comanda.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${comanda.status === 'paid' ? 'text-gray-500' : 'text-red-500/40'}`}>
                          {comanda.status === 'paid' ? 'Pago' : 'Cancelado'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center">
                <Search size={32} className="mx-auto mb-4 text-gray-800" />
                <p className="text-gray-600 font-bold text-xs uppercase tracking-[0.2em]">Sem atendimentos finalizados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nova/Editar/Visualizar Comanda - Mobile POS Refactored */}
      {selectedComanda && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-dark-950 w-full max-w-6xl md:h-[92vh] rounded-t-[2.5rem] md:rounded-[2.5rem] border-t md:border border-gray-800/80 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-32 md:zoom-in-95 duration-500 flex flex-col">

            {/* Modal Header - POS Style */}
            <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-800/80 bg-dark-900/50 sticky top-0 z-20">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-dark-950">
                    <ClipboardList size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                      {isReadOnly ? `Atendimento Finalizado` : (selectedComanda.clientName ? `${selectedComanda.clientName}` : 'Iniciando Comanda')}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{isReadOnly ? 'Venda Paga' : 'Terminal de Vendas'}</p>
                      {isReadOnly && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.15em] ${selectedComanda.status === 'paid' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                          {selectedComanda.status === 'paid' ? 'Pago' : 'Cancelado'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isReadOnly && (
                  <>
                    {['admin', 'super_admin', 'receptionist'].includes(role) && (
                      <button
                        onClick={handleCancelComanda}
                        className="p-3 bg-orange-500/5 text-orange-500 hover:bg-orange-500/10 rounded-2xl transition-all border border-orange-500/10"
                        title="Cancelar Venda"
                      >
                        <Ban size={22} />
                      </button>
                    )}
                    {['admin', 'super_admin', 'receptionist'].includes(role) && (
                      <button
                        onClick={handleOpenDiscountModal}
                        className="p-3 bg-yellow-500/5 text-yellow-500 hover:bg-yellow-500/10 rounded-2xl transition-all border border-yellow-500/10"
                        title="Aplicar Desconto"
                      >
                        <DollarSign size={22} />
                      </button>
                    )}
                  </>
                )}

                {['admin', 'super_admin'].includes(role) && (
                  <button
                    onClick={handleDeleteComanda}
                    className="p-3 bg-red-500/5 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border border-red-500/10"
                    title="Excluir"
                  >
                    <Trash2 size={22} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedComanda(null)}
                  className="p-3 bg-gray-800 text-gray-400 hover:text-white rounded-2xl transition-all ml-2"
                >
                  <X size={26} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Lado Esquerdo: Adição de Itens - Adaptative POS */}
              <div className="w-full md:w-1/2 p-6 md:p-10 border-r border-gray-800/80 overflow-y-auto bg-dark-900/30 custom-scrollbar">
                {isReadOnly ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-dark-900/50 rounded-[3rem] border border-gray-800/30">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-green-500 blur-3xl opacity-10 animate-pulse"></div>
                      <div className="w-32 h-32 rounded-[2.5rem] bg-green-500/10 flex items-center justify-center text-green-500 border-2 border-green-500/20 relative z-10">
                        <Check size={60} strokeWidth={3} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">{selectedComanda.clientName}</h3>
                      <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px]">Atendimento Concluído</p>
                    </div>

                    <div className="w-full max-w-sm mt-10 bg-gray-800/20 rounded-3xl p-6 border border-gray-700/30">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fidelidade Creditada</span>
                        <div className="flex items-center gap-2 bg-primary-500/10 text-primary-500 px-3 py-1.5 rounded-full border border-primary-500/20">
                          <Gift size={16} />
                          <span className="font-black text-sm">
                            {Math.floor(selectedComanda.items.filter(i => i.type === 'service').reduce((acc, i) => acc + (i.price * i.quantity), 0))} PTS
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-600 font-bold text-left leading-relaxed">
                        Esta transação foi devidamente processada. O faturamento foi registrado no financeiro e o estoque de produtos baixado conforme os itens vendidos.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                    {/* Seleção de Cliente */}
                    {!selectedComanda.clientName ? (
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Identificar Cliente</label>
                        <div className="relative">
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary-500" size={24} />
                          <input
                            type="text"
                            value={searchClient}
                            onChange={(e) => setSearchClient(e.target.value)}
                            className="w-full bg-dark-900 border border-gray-800/80 rounded-3xl pl-16 pr-6 py-6 text-white font-black text-lg focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/5 shadow-2xl transition-all"
                            placeholder="Nome do Cliente..."
                          />
                          {searchClient && (
                            <div className="absolute top-full left-0 right-0 mt-4 bg-dark-900 border border-gray-800 rounded-3xl shadow-3xl z-50 max-h-72 overflow-y-auto p-2 border-t-8 border-t-primary-500">
                              {dbClients
                                .filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase()))
                                .map(client => (
                                  <button
                                    key={client.id}
                                    onClick={() => handleSelectClient(client)}
                                    className="w-full text-left px-6 py-5 text-white font-black uppercase text-sm hover:bg-primary-500 hover:text-dark-950 transition-all rounded-2xl flex items-center justify-between group"
                                  >
                                    {client.name}
                                    <Plus size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                  </button>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* POS Tabs */}
                        <div className="flex bg-dark-950 p-1.5 rounded-3xl border border-gray-800/50 shadow-inner">
                          <button
                            onClick={() => setActiveTab('services')}
                            className={`flex-1 py-5 rounded-[1.25rem] text-[10px] uppercase font-black tracking-[0.2em] transition-all flex flex-col items-center gap-2 ${activeTab === 'services' ? 'bg-primary-500 text-dark-950 shadow-xl' : 'text-gray-600 hover:text-gray-400'}`}
                          >
                            <Scissors size={24} />
                            Serviços
                          </button>
                          <button
                            onClick={() => setActiveTab('products')}
                            className={`flex-1 py-5 rounded-[1.25rem] text-[10px] uppercase font-black tracking-[0.2em] transition-all flex flex-col items-center gap-2 ${activeTab === 'products' ? 'bg-primary-500 text-dark-950 shadow-xl' : 'text-gray-600 hover:text-gray-400'}`}
                          >
                            <ShoppingBag size={24} />
                            Produtos
                          </button>
                        </div>

                        {/* Content Pane */}
                        <div className="bg-dark-900/50 p-6 md:p-8 rounded-[2.5rem] border border-gray-800/30">
                          {activeTab === 'services' ? (
                            <div className="space-y-8 animate-in zoom-in-95 fade-in duration-300">
                              <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">O que vamos realizar?</label>
                                <select
                                  value={selectedServiceId}
                                  onChange={(e) => setSelectedServiceId(e.target.value)}
                                  className="w-full bg-dark-950 border border-gray-800/80 rounded-2xl px-5 py-4 text-white font-black text-sm focus:border-primary-500 focus:outline-none transition-all appearance-none cursor-pointer"
                                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
                                >
                                  <option value="">Selecione o Serviço...</option>
                                  {dbServices.map(s => (
                                    <option key={s.id} value={s.id} className="bg-dark-900">{s.name} — R$ {s.price.toFixed(2).replace('.', ',')}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Quem vai atender?</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {dbBarbers.filter(b => b.active).map(b => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => setSelectedBarberId(b.id)}
                                      className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${selectedBarberId === b.id ? 'bg-primary-500/10 border-primary-500 ring-2 ring-primary-500/20' : 'bg-dark-950 border-gray-800/80 hover:border-gray-600'}`}
                                    >
                                      <img src={b.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}`} className="w-10 h-10 rounded-xl" alt="" />
                                      <span className={`text-[9px] font-black uppercase truncate w-full text-center ${selectedBarberId === b.id ? 'text-primary-500' : 'text-gray-500'}`}>{b.name.split(' ')[0]}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <button
                                onClick={handleAddService}
                                disabled={!selectedServiceId || !selectedBarberId}
                                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-20 disabled:scale-100 disabled:grayscale active:scale-95 text-dark-950 font-black py-5 rounded-3xl transition-all shadow-xl shadow-primary-500/20 uppercase tracking-widest text-xs mt-4"
                              >
                                Adicionar ao Pedido
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-8 animate-in zoom-in-95 fade-in duration-300">
                              <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-1">Filtrar Categoria</label>
                                <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar-horizontal scroll-smooth">
                                  <button
                                    onClick={() => { setSelectedProductCategory(''); setSelectedProductId(''); }}
                                    className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedProductCategory === ''
                                      ? 'bg-primary-500 border-primary-500 text-dark-950 shadow-lg'
                                      : 'bg-dark-950 border-gray-800 text-gray-500 hover:border-gray-600'
                                      }`}
                                  >
                                    Tudo
                                  </button>
                                  {productCategories.map(cat => (
                                    <button
                                      key={cat}
                                      onClick={() => { setSelectedProductCategory(cat); setSelectedProductId(''); }}
                                      className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedProductCategory === cat
                                        ? 'bg-primary-500 border-primary-500 text-dark-950 shadow-lg'
                                        : 'bg-dark-950 border-gray-800 text-gray-500 hover:border-gray-600'
                                        }`}
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-6">
                                <div className="space-y-4">
                                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Selecionar Produto</label>
                                  <select
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="w-full bg-dark-950 border border-gray-800/80 rounded-2xl px-5 py-4 text-white font-black text-sm focus:border-primary-500 transition-all appearance-none cursor-pointer"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
                                  >
                                    <option value="">
                                      {filteredProducts.length === 0 ? '-- Categoria vazia --' : 'Selecione o Produto...'}
                                    </option>
                                    {filteredProducts.map(p => (
                                      <option key={p.id} value={p.id}>{p.name} — R$ {p.price.toFixed(2).replace('.', ',')}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-4">
                                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Quantidade</label>
                                  <div className="flex items-center gap-4">
                                    <button
                                      type="button"
                                      onClick={() => setProductQty(Math.max(1, productQty - 1))}
                                      className="w-14 h-14 rounded-2xl bg-dark-950 border border-gray-800 text-white font-black text-xl hover:border-primary-500 transition-all"
                                    >-</button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={productQty}
                                      onChange={(e) => setProductQty(parseInt(e.target.value) || 1)}
                                      className="flex-1 bg-dark-950 border border-gray-800/80 rounded-2xl px-5 py-4 text-white font-black text-center text-xl focus:border-primary-500 outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setProductQty(productQty + 1)}
                                      className="w-14 h-14 rounded-2xl bg-dark-950 border border-gray-800 text-white font-black text-xl hover:border-primary-500 transition-all"
                                    >+</button>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={handleAddProduct}
                                disabled={!selectedProductId}
                                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-20 disabled:scale-100 disabled:grayscale active:scale-95 text-dark-950 font-black py-5 rounded-3xl transition-all shadow-xl shadow-primary-500/20 uppercase tracking-widest text-xs mt-4"
                              >
                                Adicionar ao Pedido
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lado Direito: Resumo da Comanda - Adaptative POS */}
              <div className="w-full md:w-1/2 flex flex-col bg-dark-950 relative border-t md:border-t-0 border-gray-800/80">
                <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                      <ClipboardList size={16} className="text-primary-500" /> Carrinho de Itens
                    </h3>
                    <span className="text-[10px] font-black bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full border border-gray-700/50 leading-none">
                      {selectedComanda.items.length} ITENS
                    </span>
                  </div>

                  {selectedComanda.items.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-10 bg-dark-900/20 rounded-[2.5rem] border border-dashed border-gray-800/50">
                      <ShoppingBag size={40} className="text-gray-800 mb-4" />
                      <p className="text-gray-700 font-black text-xs uppercase tracking-widest">Aguardando itens...</p>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                      {selectedComanda.items.map((item) => (
                        <div key={item.id} className={`flex justify-between items-center bg-dark-900/50 p-5 rounded-3xl border ${isReadOnly ? 'border-gray-800/30 opacity-70' : 'border-gray-800/80 hover:border-primary-500/30'} transition-all group`}>
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-3">
                              <span className={`w-3 h-3 rounded-full shrink-0 shadow-lg ${item.type === 'service' ? 'bg-blue-500 shadow-blue-500/20' : 'bg-purple-500 shadow-purple-500/20'}`}></span>
                              <p className="text-white font-black text-sm uppercase tracking-tight truncate">{item.name}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 pl-6">
                              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{item.quantity}x R$ {item.price.toFixed(2).replace('.', ',')}</span>
                              {item.barberId && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-800"></span>
                                  <span className="text-[10px] font-black text-primary-500/70 uppercase tracking-widest truncate">{getBarberName(item.barberId)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-5 shrink-0">
                            <span className="text-white font-black text-base tracking-tighter">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                            {!isReadOnly && (
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="w-10 h-10 rounded-xl bg-red-500/5 text-gray-700 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 transition-all flex items-center justify-center"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Totais e Checkout - POS Premium */}
                <div className="p-8 md:p-10 border-t border-gray-800/80 bg-dark-950/80 backdrop-blur-xl relative z-10">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-gray-800/50 rounded-b-full md:hidden"></div>

                  {!isReadOnly ? (
                    <div className="space-y-8">
                      {/* Seletor de Pagamento Profissional */}
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Modalidade de Pagamento</label>
                        <div className="grid grid-cols-4 gap-3">
                          {Object.values(PaymentMethod).map(method => (
                            <button
                              key={method}
                              onClick={() => setPaymentMethod(method)}
                              className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-2 relative group overflow-hidden ${paymentMethod === method
                                ? 'bg-primary-500 border-primary-500 text-dark-950 shadow-2xl shadow-primary-500/20'
                                : 'bg-dark-900 border-gray-800 text-gray-600 hover:border-gray-600'
                                }`}
                            >
                              <div className="relative z-10">
                                {method === PaymentMethod.PIX && <span className="font-black text-xs leading-none">PIX</span>}
                                {method === PaymentMethod.CREDIT_CARD && <CreditCard size={20} />}
                                {method === PaymentMethod.DEBIT_CARD && <CreditCard size={20} className="opacity-70" />}
                                {method === PaymentMethod.CASH && <DollarSign size={20} />}
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest relative z-10">{method}</span>
                              {paymentMethod === method && (
                                <div className="absolute inset-0 bg-white/10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-6 border-t border-gray-800/50">
                        {selectedComanda.discountAmount ? (
                          <div className="flex justify-between items-center px-2">
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Desconto Aplicado</span>
                            <span className="text-yellow-500 font-black text-sm">- R$ {selectedComanda.discountAmount.toFixed(2)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between items-center px-2">
                          <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Total Final</span>
                          <span className="text-4xl font-black text-primary-500 tracking-tighter">
                            <span className="text-sm opacity-50 mr-2">R$</span>
                            {selectedComanda.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={handleSaveComanda}
                          disabled={isSubmitting}
                          className="px-6 py-5 bg-gray-800/80 hover:bg-gray-700 active:scale-95 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-3xl transition-all flex justify-center items-center gap-3 border border-gray-700/50"
                        >
                          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          Manter Aberta
                        </button>
                        <button
                          onClick={handleFinalize}
                          disabled={selectedComanda.items.length === 0 || isSubmitting}
                          className="px-6 py-5 bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-20 disabled:grayscale text-dark-950 font-black text-[10px] uppercase tracking-[0.2em] rounded-3xl transition-all shadow-2xl shadow-green-500/20 flex justify-center items-center gap-3"
                        >
                          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
                          Finalizar Venda
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2 p-6 bg-dark-900 rounded-[2rem] border border-gray-800/50">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-black">Pagamento realizado via</span>
                          <div className="flex items-center gap-2 bg-primary-500/10 text-primary-500 px-3 py-1.5 rounded-full border border-primary-500/20">
                            {selectedComanda.paymentMethod === PaymentMethod.PIX && <span className="font-black text-[10px]">PIX</span>}
                            {selectedComanda.paymentMethod === PaymentMethod.CREDIT_CARD && <CreditCard size={14} />}
                            {selectedComanda.paymentMethod === PaymentMethod.DEBIT_CARD && <CreditCard size={14} />}
                            {selectedComanda.paymentMethod === PaymentMethod.CASH && <DollarSign size={14} />}
                            <span className="font-black text-xs uppercase tracking-widest">{selectedComanda.paymentMethod || 'Manual'}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-gray-800 mt-2">
                          <span className="text-sm font-black text-white uppercase tracking-widest">Recebido em conta</span>
                          <span className="text-3xl font-black text-green-500 tracking-tighter">R$ {selectedComanda.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedComanda(null)}
                        className="w-full py-5 bg-gray-800 hover:bg-gray-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-3xl transition-all"
                      >
                        Fechar Comanda
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Desconto POS Style */}
      {showDiscountModal && selectedComanda && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-dark-900 w-full max-w-lg rounded-[3rem] border border-yellow-500/20 shadow-3xl p-8 md:p-10 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-[1.5rem] bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20">
                <Gift size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Aplicar Desconto</h3>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-1">Concessão de benefício</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Valor do Abatimento (R$)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-600 text-xl">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedComanda.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)}
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-dark-950 border border-gray-800 rounded-3xl pl-16 pr-6 py-6 text-white font-black text-3xl focus:border-yellow-500 focus:outline-none transition-all tracking-tighter"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Justificativa {role === 'receptionist' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full bg-dark-950 border border-gray-800 rounded-3xl px-6 py-5 text-white font-bold focus:outline-none focus:border-yellow-500 resize-none"
                  placeholder={role === 'receptionist' ? "Obrigatório para segurança operacional" : "Motivo do desconto..."}
                  rows={3}
                  required={role === 'receptionist'}
                />
              </div>

              <div className="bg-dark-950/50 p-6 rounded-3xl border border-gray-800/80">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-600 mb-4">
                  <span>Resumo do Ajuste</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-400">Total Original:</span>
                  <span className="text-white font-black text-sm">R$ {selectedComanda.items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-5 pb-5 border-b border-gray-800">
                  <span className="text-xs font-bold text-gray-400">Desconto:</span>
                  <span className="text-yellow-500 font-black text-lg">- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-white uppercase tracking-widest">Valor Final:</span>
                  <span className="text-3xl font-black text-green-500 tracking-tighter">
                    R$ {Math.max(0, selectedComanda.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) - discountAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setShowDiscountModal(false);
                    setDiscountAmount(0);
                    setDiscountReason('');
                  }}
                  className="flex-1 bg-gray-800/80 hover:bg-gray-700 text-white px-6 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all border border-gray-700/50"
                >
                  Desistir
                </button>
                <button
                  onClick={handleApplyDiscount}
                  className="flex-2 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-dark-950 px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-2xl shadow-yellow-500/20"
                >
                  Confirmar Desconto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComandasPage;
