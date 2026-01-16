import React, { useState, useEffect } from 'react';
import {
    Users,
    Clock,
    Search,
    Trash2,
    CheckCircle2,
    BellRing,
    Play,
    XCircle,
    Plus,
    Settings,
    Shield,
    Hourglass,
    Sliders,
    Loader2
} from 'lucide-react';
import { WaitlistEntry, Client, Barber, Service } from '../types';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

interface WaitlistConfig {
    maxCapacity: number;
    minTimeGapMinutes: number;
    audience: 'all' | 'subscribers_only';
}

const WaitingListPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [dbClients, setDbClients] = useState<Client[]>([]);
    const [dbBarbers, setDbBarbers] = useState<Barber[]>([]);
    const [dbServices, setDbServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [waitlistEnabled, setWaitlistEnabled] = useState(true);
    const [isUpdatingToggle, setIsUpdatingToggle] = useState(false);

    const [simulationRunning, setSimulationRunning] = useState(false);
    const [simulationLog, setSimulationLog] = useState<string[]>([]);

    const [config, setConfig] = useState<WaitlistConfig>({
        maxCapacity: 10,
        minTimeGapMinutes: 30,
        audience: 'all'
    });
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newEntryClientId, setNewEntryClientId] = useState('');
    const [newEntryBarberId, setNewEntryBarberId] = useState('any');
    const [newEntryServiceId, setNewEntryServiceId] = useState('');

    const fetchData = async () => {
        if (!currentUser?.tenantId) return;

        try {
            setLoading(true);
            const [wlRes, clientsRes, barbersRes, servicesRes, tenantRes] = await Promise.all([
                supabase.from('waitlist').select('*').eq('tenant_id', currentUser.tenantId).order('created_at', { ascending: true }),
                supabase.from('clients').select('*').eq('tenant_id', currentUser.tenantId),
                supabase.from('profiles').select('*').eq('tenant_id', currentUser.tenantId),
                supabase.from('services').select('*').eq('tenant_id', currentUser.tenantId),
                supabase.from('tenants').select('settings').eq('id', currentUser.tenantId).single()
            ]);

            if (wlRes.error) throw wlRes.error;
            if (clientsRes.error) throw clientsRes.error;
            if (barbersRes.error) throw barbersRes.error;
            if (servicesRes.error) throw servicesRes.error;

            const settings = tenantRes.data?.settings || {};
            setWaitlistEnabled(settings.waitlist_enabled !== false);

            setWaitlist((wlRes.data || []).map(w => ({
                id: w.id,
                clientId: w.client_id,
                barberId: w.barber_id || 'any',
                serviceId: w.service_id,
                desiredDate: w.desired_date,
                requestTime: w.created_at,
                status: w.status as any,
                notes: w.notes
            })));

            setDbClients((clientsRes.data || []).map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                avatar: c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
                totalVisits: c.total_visits || 0,
                loyaltyPoints: c.loyalty_points || 0,
                subscriptionStatus: c.subscription_status
            })));

            setDbBarbers((barbersRes.data || []).map(b => ({
                id: b.id,
                name: b.name,
                role: b.role,
                avatar: b.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=random`,
                email: b.email,
                active: b.active,
                commissionRate: b.commission_rate
            })));

            setDbServices((servicesRes.data || []).map(s => ({
                id: s.id,
                name: s.name,
                price: s.price,
                durationMinutes: s.duration_minutes,
                description: s.description,
                chips: s.chips
            })));

        } catch (error) {
            console.error('Erro ao buscar dados da fila:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentUser?.tenantId]);

    const enrichedList = waitlist.map(entry => ({
        ...entry,
        client: dbClients.find(c => c.id === entry.clientId),
        barber: entry.barberId === 'any' ? { name: 'Qualquer' } : dbBarbers.find(b => b.id === entry.barberId),
        service: dbServices.find(s => s.id === entry.serviceId)
    }));

    const activeCount = waitlist.filter(w => w.status === 'waiting').length;

    const addToLog = (msg: string) => {
        setSimulationLog(prev => [msg, ...prev]);
    };

    const handleSimulateCancellation = async () => {
        if (simulationRunning) return;
        setSimulationRunning(true);
        setSimulationLog([]);

        const minutesRemaining = Math.floor(Math.random() * 110) + 10;

        addToLog(`⚠️ [Simulação] Cliente agendado cancelou horário.`);
        addToLog(`⏳ Faltam ${minutesRemaining} minutos para o atendimento.`);

        if (minutesRemaining < config.minTimeGapMinutes) {
            addToLog(`🚫 Ação abortada: Cancelamento muito próximo do horário.`);
            addToLog(`ℹ️ Configuração atual exige no mínimo ${config.minTimeGapMinutes} minutos de antecedência.`);
            setSimulationRunning(false);
            return;
        }

        let queue = [...waitlist].filter(w => w.status === 'waiting');

        if (config.audience === 'subscribers_only') {
            const initialLength = queue.length;
            queue = queue.filter(entry => {
                const client = dbClients.find(c => c.id === entry.clientId);
                return client?.subscriptionStatus === 'active';
            });
            if (initialLength > queue.length) {
                addToLog(`🔒 Filtro VIP ativo: ${initialLength - queue.length} não-assinantes ignorados.`);
            }
        }

        if (queue.length === 0) {
            addToLog("ℹ️ Ninguém qualificado na fila de espera. Horário voltou para a agenda geral.");
            setSimulationRunning(false);
            return;
        }

        addToLog(`📋 ${queue.length} pessoas aptas na fila. Iniciando contato automático...`);

        const processQueue = async (index: number) => {
            if (index >= queue.length) {
                addToLog("❌ Ninguém aceitou o horário. Disponibilizado na agenda geral.");
                setSimulationRunning(false);
                return;
            }

            const entry = queue[index];
            const clientName = dbClients.find(c => c.id === entry.clientId)?.name || 'Cliente';

            await supabase.from('waitlist').update({ status: 'notified' }).eq('id', entry.id);
            setWaitlist(prev => prev.map(w => w.id === entry.id ? { ...w, status: 'notified' } : w));

            addToLog(`📲 Enviando notificação para ${clientName} (Posição ${index + 1})...`);

            await new Promise(resolve => setTimeout(resolve, 1500));

            const accepted = Math.random() < 0.3;

            if (accepted) {
                await supabase.from('waitlist').update({ status: 'accepted' }).eq('id', entry.id);
                setWaitlist(prev => prev.map(w => w.id === entry.id ? { ...w, status: 'accepted' } : w));
                addToLog(`✅ ${clientName} ACEITOU o horário! Agendamento confirmado.`);
                addToLog("🎉 Fila processada com sucesso.");
                setSimulationRunning(false);
            } else {
                await supabase.from('waitlist').update({ status: 'declined' }).eq('id', entry.id);
                setWaitlist(prev => prev.map(w => w.id === entry.id ? { ...w, status: 'declined' } : w));
                addToLog(`🚫 ${clientName} recusou ou não respondeu.`);
                addToLog(`⏭️ Passando para o próximo da fila...`);
                await processQueue(index + 1);
            }
        };

        await processQueue(0);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'waiting': return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded text-xs font-bold flex items-center gap-1"><Clock size={12} /> Aguardando</span>;
            case 'notified': return <span className="px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-xs font-bold flex items-center gap-1 animate-pulse"><BellRing size={12} /> Notificado</span>;
            case 'accepted': return <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Aceitou</span>;
            case 'declined': return <span className="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-xs font-bold flex items-center gap-1"><XCircle size={12} /> Recusou</span>;
            default: return <span className="px-2 py-1 bg-gray-800 text-gray-500 rounded text-xs">Expirado</span>;
        }
    };

    const handleAddManual = async () => {
        if (!newEntryClientId || !newEntryServiceId || !currentUser) return;

        if (activeCount >= config.maxCapacity) {
            alert(`Capacidade máxima da fila (${config.maxCapacity}) atingida!`);
            return;
        }

        try {
            const { error } = await supabase.from('waitlist').insert([{
                client_id: newEntryClientId,
                barber_id: newEntryBarberId === 'any' ? null : newEntryBarberId,
                service_id: newEntryServiceId,
                desired_date: new Date().toISOString().split('T')[0],
                tenant_id: currentUser.tenantId,
                status: 'waiting'
            }]);

            if (error) throw error;

            setIsAddModalOpen(false);
            setNewEntryClientId('');
            setNewEntryBarberId('any');
            setNewEntryServiceId('');
            fetchData();
        } catch (error) {
            console.error('Erro ao adicionar à fila:', error);
            alert('Erro ao adicionar à fila.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from('waitlist').delete().eq('id', id);
            if (error) throw error;
            setWaitlist(prev => prev.filter(w => w.id !== id));
        } catch (error) {
            console.error('Erro ao excluir:', error);
        }
    };

    const toggleWaitlist = async (enabled: boolean) => {
        if (!currentUser?.tenantId) return;
        try {
            setIsUpdatingToggle(true);
            const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', currentUser.tenantId).single();
            const newSettings = { ...(tenant?.settings || {}), waitlist_enabled: enabled };

            const { error } = await supabase.from('tenants').update({ settings: newSettings }).eq('id', currentUser.tenantId);
            if (error) throw error;

            setWaitlistEnabled(enabled);
            if (enabled) fetchData();
        } catch (error) {
            console.error('Erro ao alternar fila:', error);
            alert('Erro ao atualizar configuração.');
        } finally {
            setIsUpdatingToggle(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary-500" size={48} />
            </div>
        );
    }

    if (!waitlistEnabled) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-gray-800/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-500 border border-gray-700">
                    <Clock size={48} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Fila de Espera Desativada</h2>
                <p className="text-gray-400 mb-8 leading-relaxed">
                    A Fila de Espera Inteligente ajuda a preencher buracos na sua agenda causados por cancelamentos de última hora de forma automática.
                </p>
                <button
                    onClick={() => toggleWaitlist(true)}
                    disabled={isUpdatingToggle}
                    className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
                >
                    {isUpdatingToggle ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                    Ativar Fila de Espera
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Fila de Espera Inteligente</h1>
                    <p className="text-gray-400">Automação de preenchimento de vagas por cancelamento.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsConfigModalOpen(true)}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors border border-gray-700"
                    >
                        <Settings size={20} /> Regras da Fila
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-primary-500/20"
                    >
                        <Plus size={20} /> Adicionar à Fila
                    </button>
                </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-6 items-center text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                    <div className="p-1.5 bg-blue-500/10 rounded text-blue-500"><Users size={16} /></div>
                    <span>Capacidade: <strong>{activeCount} / {config.maxCapacity}</strong></span>
                </div>
                <div className="h-4 w-px bg-gray-700"></div>
                <div className="flex items-center gap-2 text-gray-300">
                    <div className="p-1.5 bg-yellow-500/10 rounded text-yellow-500"><Hourglass size={16} /></div>
                    <span>Acionamento Mínimo: <strong>{config.minTimeGapMinutes} min</strong> antes</span>
                </div>
                <div className="h-4 w-px bg-gray-700"></div>
                <div className="flex items-center gap-2 text-gray-300">
                    <div className="p-1.5 bg-purple-500/10 rounded text-purple-500"><Shield size={16} /></div>
                    <span>Público: <strong>{config.audience === 'all' ? 'Todos' : 'Apenas VIPs'}</strong></span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <Users size={18} className="text-primary-500" /> Fila Atual
                        </h2>
                        <div className="text-xs text-gray-500">Ordenado por chegada</div>
                    </div>
                    <div className="divide-y divide-gray-800">
                        {loading ? (
                            <div className="p-8 flex items-center justify-center">
                                <Loader2 className="animate-spin text-primary-500" size={32} />
                            </div>
                        ) : enrichedList.length > 0 ? (
                            enrichedList.map((item, index) => (
                                <div key={item.id} className="p-4 hover:bg-gray-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-gray-500 font-mono text-sm w-4">#{index + 1}</div>
                                        <div className="relative">
                                            <img src={item.client?.avatar} className="w-10 h-10 rounded-full bg-gray-800 object-cover" />
                                            {item.client?.subscriptionStatus === 'active' && (
                                                <div className="absolute -top-1 -right-1 bg-primary-500 text-dark-950 text-[8px] font-bold px-1 rounded-full border border-dark-900">VIP</div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{item.client?.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <span className="flex items-center gap-1"><Users size={10} /> {item.barber?.name || 'Qualquer'}</span>
                                                <span>•</span>
                                                <span>{item.service?.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto">
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Deseja: {new Date(item.desiredDate).toLocaleDateString()}</p>
                                            <div className="mt-1">{getStatusBadge(item.status)}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-gray-500 hover:text-red-500 p-2"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500">Ninguém na fila de espera.</div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-16 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>

                        <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2 relative z-10">
                            <Play size={20} className="text-blue-500" /> Simulador de Vaga
                        </h3>
                        <p className="text-gray-400 text-sm mb-6 relative z-10">
                            Simule o que acontece quando um cliente cancela e o sistema tenta preencher a vaga automaticamente usando a fila.
                        </p>

                        <button
                            onClick={handleSimulateCancellation}
                            disabled={simulationRunning}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 relative z-10"
                        >
                            {simulationRunning ? (
                                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Processando...</>
                            ) : (
                                "Liberar Vaga (Simular Cancelamento)"
                            )}
                        </button>
                    </div>

                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4 font-mono text-xs h-64 overflow-y-auto custom-scrollbar flex flex-col-reverse">
                        {simulationLog.length === 0 ? (
                            <p className="text-gray-600 italic text-center mt-20">Aguardando ação...</p>
                        ) : (
                            simulationLog.map((log, i) => (
                                <div key={i} className="mb-1.5 text-gray-300 border-b border-gray-800/50 pb-1 last:border-0">
                                    <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span> {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-dark-900 rounded-xl border border-gray-800 w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Adicionar à Fila</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Cliente</label>
                                <select
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    value={newEntryClientId}
                                    onChange={(e) => setNewEntryClientId(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {dbClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Serviço</label>
                                <select
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    value={newEntryServiceId}
                                    onChange={(e) => setNewEntryServiceId(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {dbServices.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Profissional Preferido (Opcional)</label>
                                <select
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    value={newEntryBarberId}
                                    onChange={(e) => setNewEntryBarberId(e.target.value)}
                                >
                                    <option value="any">Qualquer um</option>
                                    {dbBarbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 bg-gray-800 text-white rounded-lg">Cancelar</button>
                                <button onClick={handleAddManual} className="flex-1 py-2 bg-primary-500 text-dark-950 font-bold rounded-lg">Salvar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isConfigModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-dark-900 rounded-xl border border-gray-800 w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Sliders size={20} className="text-primary-500" /> Regras da Fila
                            </h3>
                            <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-white"><XCircle size={24} /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Capacidade Máxima da Fila</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={config.maxCapacity}
                                        onChange={(e) => setConfig({ ...config, maxCapacity: parseInt(e.target.value) })}
                                        className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 text-center"
                                    />
                                    <span className="text-sm text-gray-500">pessoas aguardando</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Tempo Mínimo de Antecedência</label>
                                <p className="text-xs text-gray-500 mb-2">Se o cancelamento ocorrer com menos tempo que isso, a fila não será notificada (muito em cima da hora).</p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="5"
                                        value={config.minTimeGapMinutes}
                                        onChange={(e) => setConfig({ ...config, minTimeGapMinutes: parseInt(e.target.value) })}
                                        className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 text-center"
                                    />
                                    <span className="text-sm text-gray-500">minutos</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Público da Fila</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setConfig({ ...config, audience: 'all' })}
                                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${config.audience === 'all' ? 'bg-primary-500/10 border-primary-500 text-primary-500' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                                    >
                                        <Users size={20} />
                                        <span className="text-xs font-bold">Todos</span>
                                    </button>
                                    <button
                                        onClick={() => setConfig({ ...config, audience: 'subscribers_only' })}
                                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${config.audience === 'subscribers_only' ? 'bg-primary-500/10 border-primary-500 text-primary-500' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                                    >
                                        <Shield size={20} />
                                        <span className="text-xs font-bold">Apenas VIPs</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-800 space-y-3">
                                <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                    <div>
                                        <p className="text-sm font-bold text-red-400">Desativar Recurso</p>
                                        <p className="text-[10px] text-gray-500">Ocultar a fila para esta barbearia</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm('Tem certeza que deseja desativar a fila?')) toggleWaitlist(false);
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <XCircle size={20} />
                                    </button>
                                </div>

                                <button
                                    onClick={() => setIsConfigModalOpen(false)}
                                    className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors"
                                >
                                    Salvar Configurações
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaitingListPage;
