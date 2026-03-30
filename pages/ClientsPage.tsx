import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, Mail, Phone, Crown, Gift, Plus, X, Save, MessageCircle, Upload, Download, Trash2, Edit2, Calendar, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Client } from '../types';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

const ClientsPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado para edição/criação
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isDeleteConfirming, setIsDeleteConfirming] = useState(false); // Controle de exclusão no modal
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        birthDate: ''
    });

    const [stats, setStats] = useState({
        newClientsMonth: 0,
        totalAppointmentsMonth: 0,
        weeklyRecurring: 0,
        biweeklyRecurring: 0
    });

    // --- FETCH CLIENTS ---
    const fetchClients = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');

            if (error) throw error;

            if (data) {
                const mappedClients: Client[] = data.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    email: c.email || '',
                    phone: c.phone || '',
                    birthDate: c.birth_date,
                    totalVisits: c.total_visits || 0,
                    loyaltyPoints: c.loyalty_points || 0,
                    avatar: c.avatar || null,
                    subscriptionStatus: c.subscription_status,
                    subscriptionPlanId: c.subscription_plan_id,
                    subscriptionRenewsAt: c.subscription_renews_at,
                    tenant_id: c.tenant_id,
                    created_at: c.created_at
                }));
                setClients(mappedClients);
                calculateMonthlyStats(mappedClients);
            }
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            alert('Erro ao carregar clientes. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    };

    const calculateMonthlyStats = async (allClients: Client[]) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        // 1. Novos Clientes no Mês
        const newClients = allClients.filter(c => {
            if (!c.created_at) return false;
            const createdDate = new Date(c.created_at);
            return createdDate.getFullYear() === now.getFullYear() && createdDate.getMonth() === now.getMonth();
        }).length;

        // 2. Total de Atendimentos e Recorrência (Março 2026)
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('client_id, date, status')
            .gte('date', '2026-03-01')
            .lte('date', '2026-03-31');

        if (error) {
            console.error('Erro ao buscar atendimentos para stats:', error);
            return;
        }

        const totalApps = appointments?.filter(app => app.status === 'Concluído' || app.status === 'Agendado').length || 0;

        // Mapa de frequência por cliente (apenas concluídos ou agendados)
        const clientFrequency: Record<string, number> = {};
        appointments?.forEach(app => {
            if (app.client_id && (app.status === 'Concluído' || app.status === 'Agendado')) {
                clientFrequency[app.client_id] = (clientFrequency[app.client_id] || 0) + 1;
            }
        });

        const weekly = Object.values(clientFrequency).filter(count => count >= 4).length;
        const biweekly = Object.values(clientFrequency).filter(count => count >= 2).length;

        setStats({
            newClientsMonth: newClients,
            totalAppointmentsMonth: totalApps,
            weeklyRecurring: weekly,
            biweeklyRecurring: biweekly
        });
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- ORDENAÇÃO E FILTRO ---
    const filteredAndSortedClients = useMemo(() => {
        return clients
            .filter(client =>
                client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.phone.includes(searchTerm)
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, searchTerm]);

    // --- LÓGICA DE EXPORTAÇÃO (DOWNLOAD) ---
    const handleExport = () => {
        const headers = ['Nome,Email,Telefone,Nascimento,Visitas,Pontos,Status Assinatura'];

        const rows = filteredAndSortedClients.map(client => {
            const safeName = `"${client.name.replace(/"/g, '""')}"`;
            return [
                safeName,
                client.email,
                client.phone,
                client.birthDate || '',
                client.totalVisits,
                client.loyaltyPoints || 0,
                client.subscriptionStatus || 'inativo'
            ].join(',');
        });

        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `clientes_barbermaster_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- LÓGICA DE IMPORTAÇÃO (UPLOAD INTELIGENTE) ---
    const triggerImport = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split(/\r?\n/).filter(line => line.trim());
            const newClientsToInsert: any[] = [];

            // 1. Helper simples para separar CSV respeitando aspas
            const splitCsv = (line: string) => {
                const res: string[] = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') { inQuotes = !inQuotes; }
                    else if ((char === ',' || char === ';') && !inQuotes) {
                        res.push(current.trim().replace(/^"|"$/g, ''));
                        current = '';
                    } else { current += char; }
                }
                res.push(current.trim().replace(/^"|"$/g, ''));
                return res;
            };

            // 2. Identificar colunas
            let nameIdx = 0;
            let emailIdx = 1;
            let phoneIdx = 2;
            let startIndex = 0;

            if (lines.length > 0) {
                const headerRow = lines[0].toLowerCase();
                // Verifica palavras chaves para confirmar se é cabeçalho
                if (headerRow.includes('nome') || headerRow.includes('name') || headerRow.includes('id')) {
                    const headers = splitCsv(lines[0].toLowerCase());

                    const fName = headers.findIndex(h => h === 'nome' || h === 'name' || h.includes('cliente'));
                    const fEmail = headers.findIndex(h => h === 'email' || h === 'e-mail');
                    const fPhone = headers.findIndex(h => h === 'telefone' || h === 'celular' || h === 'whatsapp' || h === 'tel' || h === 'contato');

                    if (fName !== -1) nameIdx = fName;
                    if (fEmail !== -1) emailIdx = fEmail;
                    if (fPhone !== -1) phoneIdx = fPhone;

                    startIndex = 1; // Pular linha do cabeçalho
                    console.log('Importação - Colunas:', { headers, nameIdx, emailIdx, phoneIdx });
                }
            }

            // 3. Processar linhas e checar duplicatas
            let duplicatesCount = 0;

            for (let i = startIndex; i < lines.length; i++) {
                const cols = splitCsv(lines[i]);
                if (cols.length <= 1) continue; // Linha vazia ou mal formada

                const name = cols[nameIdx] || '';
                let email = (emailIdx !== -1) ? cols[emailIdx] : '';
                let phone = (phoneIdx !== -1) ? cols[phoneIdx] : '';

                // Limpeza básica
                if (phone) phone = phone.replace(/[^\d+]/g, '');
                if (email && !email.includes('@')) email = ''; // Validar email básico

                // Se não achou nome mas achou email na coluna do nome...
                if (!name && email) {
                    // fallback raro
                }

                if (!name || name.replace(/\d/g, '').length < 2) continue; // Pular se nome for só números (IDs errados)

                // CHECAGEM DE DUPLICIDADE (Comparar com clientes já na tela)
                const exists = clients.some(c =>
                    (phone && c.phone && c.phone.replace(/[^\d]/g, '') === phone.replace(/[^\d]/g, '')) ||
                    (email && c.email && c.email.toLowerCase() === email.toLowerCase())
                );

                if (exists) {
                    duplicatesCount++;
                    continue; // Ignora este cliente
                }

                newClientsToInsert.push({
                    name,
                    email: email || null,
                    phone: phone || null,
                    tenant_id: currentUser?.tenantId
                });
            }

            if (newClientsToInsert.length > 0) {
                try {
                    const { error } = await supabase.from('clients').insert(newClientsToInsert);
                    if (error) throw error;

                    let msg = `${newClientsToInsert.length} clientes importados com sucesso!`;
                    if (duplicatesCount > 0) msg += `\n(${duplicatesCount} duplicados foram ignorados)`;

                    alert(msg);
                    fetchClients();
                } catch (err) {
                    console.error(err);
                    alert('Erro ao importar. Verifique o console.');
                }
            } else {
                if (duplicatesCount > 0) {
                    alert(`Todos os ${duplicatesCount} clientes do arquivo já estão cadastrados!`);
                } else {
                    alert('Nenhum dado válido encontrado. Verifique se o arquivo segue o padrão: Nome, Email, Telefone');
                }
            }

            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleOpenModal = (client?: Client) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                name: client.name,
                email: client.email || '',
                phone: client.phone,
                birthDate: client.birthDate || ''
            });
        } else {
            setEditingClient(null);
            setFormData({ name: '', email: '', phone: '', birthDate: '' });
        }
        setIsModalOpen(true);
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();

        const clientData = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            birth_date: formData.birthDate || null, // DB expects snake_case
            tenant_id: currentUser?.tenantId
        };

        try {
            if (editingClient) {
                // Update
                const { error } = await supabase
                    .from('clients')
                    .update(clientData)
                    .eq('id', editingClient.id);

                if (error) throw error;
                alert('Cliente atualizado com sucesso!');
            } else {
                // Create
                const { error } = await supabase
                    .from('clients')
                    .insert([clientData]);

                if (error) throw error;

                // Optional: WhatsApp welcome message logic could go here
                const phoneClean = formData.phone.replace(/\D/g, '');
                if (phoneClean.length >= 10) {
                    const appLink = "https://app.barbermaster.com.br";
                    const message = `Olá ${formData.name}! Seu cadastro na BarberMaster foi realizado com sucesso. ✂️\n\nBaixe nosso app e clique em "Primeiro Acesso" para definir sua senha.\n\nLink: ${appLink}`;
                    const whatsappUrl = `https://wa.me/55${phoneClean}?text=${encodeURIComponent(message)}`;
                    // window.open(whatsappUrl, '_blank'); // Uncomment if desired
                }
                alert('Cliente cadastrado com sucesso!');
            }
            setIsModalOpen(false);
            fetchClients();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar cliente. Tente novamente.');
        }
    };

    const handleDeleteClient = async (id: string) => {
        // Confirmação via UI (Modal) - Lógica Nuclear
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('✅ Cliente excluído com sucesso! A página será recarregada.');
            window.location.reload();
        } catch (error: any) {
            console.error('Erro ao excluir:', error);
            alert(`❌ Erro ao excluir cliente: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const handleDeleteAll = async () => {
        const confirmText = window.prompt('Esta ação apagará TODOS os clientes e TODOS os agendamentos deles.\n\nPara confirmar, digite "DELETAR" abaixo:');
        if (confirmText?.toUpperCase() !== 'DELETAR') return;

        try {
            setLoading(true);

            // SIMPLIFIED DELETE ALL: Relies on DB ON DELETE CASCADE
            // Deletes all clients that are not the system placeholder '00...00'
            const { error } = await supabase
                .from('clients')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (error) throw error;

            setClients([]);
            alert('Todos os clientes e agendamentos foram excluídos com sucesso.');
        } catch (error: any) {
            console.error('Erro ao excluir todos:', error);
            alert(`Erro ao limpar a base de clientes: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Clientes</h1> {/* Removido Count mockado */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nome, email..."
                            className="pl-10 pr-4 py-2 bg-dark-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 w-full md:w-64"
                        />
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        accept=".csv,.txt"
                        className="hidden"
                    />

                    <button
                        onClick={triggerImport}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors border border-gray-700"
                        title="Importar CSV"
                    >
                        <Upload size={20} />
                        <span className="hidden sm:inline">Importar</span>
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors border border-gray-700"
                    >
                        <Download size={20} />
                        <span className="hidden sm:inline">Exportar</span>
                    </button>

                    <button
                        onClick={handleDeleteAll}
                        className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg font-semibold transition-colors border border-red-500/20"
                        title="Apagar todos os clientes"
                    >
                        <Trash2 size={20} />
                        <span className="hidden sm:inline">Limpar Tudo</span>
                    </button>

                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-primary-500/20"
                    >
                        <Plus size={20} />
                        Novo Cliente
                    </button>
                </div>
            </div>

            {/* Monthly Overview Stats - Only for Admins */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'super_admin') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-dark-900 p-6 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp size={48} className="text-primary-500" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium mb-1">Recorrência Semanal</p>
                        <h3 className="text-3xl font-black text-white mb-2">{stats.weeklyRecurring}</h3>
                        <p className="text-xs text-gray-600">Clientes com 4+ visitas/mês</p>
                    </div>

                    <div className="bg-dark-900 p-6 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCircle size={48} className="text-primary-500" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium mb-1">Recorrência Quinzenal</p>
                        <h3 className="text-3xl font-black text-white mb-2">{stats.biweeklyRecurring}</h3>
                        <p className="text-xs text-gray-600">Clientes com 2+ visitas/mês</p>
                    </div>

                    <div className="bg-dark-900 p-6 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users size={48} className="text-primary-500" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium mb-1">Novos Clientes (Mês)</p>
                        <h3 className="text-3xl font-black text-white mb-2">{stats.newClientsMonth}</h3>
                        <p className="text-xs text-gray-600">Cadastrados este mês</p>
                    </div>

                    <div className="bg-dark-900 p-6 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Calendar size={48} className="text-primary-500" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium mb-1">Atendimentos (Mês)</p>
                        <h3 className="text-3xl font-black text-white mb-2">{stats.totalAppointmentsMonth}</h3>
                        <p className="text-xs text-gray-600">Total de agendamentos concluídos</p>
                    </div>
                </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden md:block bg-dark-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-400">
                        <thead className="bg-gray-900 text-xs uppercase font-bold text-gray-500 border-b border-gray-800">
                            <tr>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Contato</th>
                                <th className="px-6 py-4">Fidelidade</th>
                                <th className="px-6 py-4">Assinatura</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan={5} className="py-20 text-center"><span className="animate-pulse">Carregando...</span></td></tr>
                            ) : filteredAndSortedClients.length > 0 ? (
                                filteredAndSortedClients.map(client => (
                                    <tr key={client.id} className="hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img src={client.avatar} alt={client.name} className="w-10 h-10 rounded-full bg-gray-800 object-cover border border-gray-700" />
                                                    {client.subscriptionStatus === 'active' && (
                                                        <div className="absolute -top-1 -right-1 bg-primary-500 text-dark-950 rounded-full p-0.5 border-2 border-dark-900" title="Assinante VIP">
                                                            <Crown size={10} fill="currentColor" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white group-hover:text-primary-500 transition-colors">
                                                        {client.name}
                                                    </p>
                                                    {client.birthDate && <p className="text-[10px] text-gray-500">Nasc: {new Date(client.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Mail size={14} className={client.email ? "text-gray-400" : "text-gray-800"} />
                                                <span className={client.email ? "text-gray-300" : "text-gray-700 italic"}>{client.email || 'Sem e-mail'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className={client.phone ? "text-gray-400" : "text-gray-800"} />
                                                <span className={client.phone ? "text-gray-300" : "text-gray-700 italic"}>{client.phone || 'Sem telefone'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-start">
                                                <div className="flex items-center gap-1.5 bg-gray-800 px-2 py-1 rounded-md border border-gray-700">
                                                    <Gift size={14} className="text-primary-500" />
                                                    <span className="text-white font-bold">{client.loyaltyPoints || 0}</span>
                                                    <span className="text-[10px] text-gray-500 uppercase">pts</span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-1">
                                                    {client.totalVisits} visitas totais
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {client.subscriptionStatus === 'active' ? (
                                                <div className="flex flex-col items-start">
                                                    <span className="text-xs font-bold text-primary-500 flex items-center gap-1">
                                                        <Crown size={12} /> {client.subscriptionPlanId || 'Plano'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">Renova em {client.subscriptionRenewsAt ? new Date(client.subscriptionRenewsAt).toLocaleDateString('pt-BR') : '-'}</span>
                                                </div>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-[10px] bg-gray-800 text-gray-500 border border-gray-700 uppercase font-black">Comum</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate('/chat', { state: { clientId: client.id } })}
                                                    className="text-gray-400 hover:text-primary-500 p-2 hover:bg-gray-800 rounded-lg transition-all"
                                                    title="Conversar"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(client)}
                                                    className="text-gray-400 hover:text-primary-500 p-2 hover:bg-gray-800 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="py-20 text-center text-gray-500 italic">Nenhum cliente encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="py-20 text-center animate-pulse text-gray-500">Carregando clientes...</div>
                ) : filteredAndSortedClients.length > 0 ? (
                    filteredAndSortedClients.map(client => (
                        <div key={client.id} className="bg-dark-900 p-4 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden group active:scale-[0.98] transition-transform">
                            {client.subscriptionStatus === 'active' && (
                                <div className="absolute top-0 right-0 bg-primary-500 text-dark-950 font-black text-[10px] px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                                    <Crown size={12} /> VIP
                                </div>
                            )}

                            <div className="flex items-start gap-4">
                                <img src={client.avatar} alt={client.name} className="w-14 h-14 rounded-full bg-gray-800 object-cover border border-gray-700 shadow-md" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white text-lg truncate leading-tight mb-1">{client.name}</h3>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <Phone size={12} className="text-primary-500" />
                                            <span className="truncate">{client.phone || 'Sem telefone'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <Mail size={12} className="text-primary-500" />
                                            <span className="truncate">{client.email || 'Sem e-mail'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <div className="bg-gray-800/50 px-2 py-1 rounded border border-gray-700 flex items-center gap-1.5">
                                        <Gift size={12} className="text-primary-500" />
                                        <span className="text-white font-bold text-xs">{client.loyaltyPoints || 0}</span>
                                        <span className="text-[10px] text-gray-500 font-bold">PTS</span>
                                    </div>
                                    <div className="bg-gray-800/50 px-2 py-1 rounded border border-gray-700 flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                        {client.totalVisits} visitas
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => navigate('/chat', { state: { clientId: client.id } })}
                                        className="p-3 bg-gray-800 text-primary-500 rounded-xl border border-gray-700 active:bg-primary-500 active:text-dark-950 transition-colors"
                                    >
                                        <MessageCircle size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleOpenModal(client)}
                                        className="p-3 bg-gray-800 text-primary-500 rounded-xl border border-gray-700 active:bg-primary-500 active:text-dark-950 transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center text-gray-500 italic">Nenhum cliente encontrado.</div>
                )}
            </div>

            {/* Modal Cliente */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-800">
                            <h2 className="text-xl font-bold text-white">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveClient} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    placeholder="Ex: João da Silva"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Celular / WhatsApp</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    placeholder="(11) 99999-9999"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Data de Nascimento</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 text-gray-500" size={18} />
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate || ''}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">E-mail (Opcional)</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    placeholder="cliente@email.com"
                                />
                            </div>

                            {!editingClient && (
                                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 text-sm text-gray-300">
                                    <div className="flex items-start gap-2">
                                        <MessageCircle className="text-green-500 shrink-0" size={18} />
                                        <p>Ao salvar, você poderá enviar um convite para o cliente.</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between w-full pt-4 border-t border-gray-800">
                                {/* Delete Button (Only for existing users) */}
                                <div>
                                    {editingClient && (
                                        isDeleteConfirming ? (
                                            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteClient(editingClient.id)}
                                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg text-sm"
                                                >
                                                    CONFIRMAR
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDeleteConfirming(false)}
                                                    className="px-2 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setIsDeleteConfirming(true)}
                                                className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 font-bold rounded-lg transition-colors border border-red-500/20 text-sm"
                                            >
                                                <Trash2 size={18} />
                                                Excluir
                                            </button>
                                        )
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            setIsDeleteConfirming(false);
                                        }}
                                        className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    {!isDeleteConfirming && (
                                        <button
                                            type="submit"
                                            className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors shadow-lg"
                                        >
                                            <Save size={20} />
                                            Salvar
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

export default ClientsPage;
