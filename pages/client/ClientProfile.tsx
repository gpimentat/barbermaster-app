import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, LogOut, Clock, Star, Edit2, ShoppingBag, Gift, Bell, ChevronRight, ArrowLeft, Package, Check, Crown, CreditCard, Smartphone } from 'lucide-react';
import clientService from '../../src/services/clientService';

interface ClientProfileProps {
    tenant: any;
    clientData: any;
    onLogout: () => void;
}

type SubScreen = 'main' | 'history' | 'purchases' | 'rewards' | 'notifications';

const ClientProfile: React.FC<ClientProfileProps> = ({ tenant, clientData, onLogout }) => {
    const navigate = useNavigate();
    const [subScreen, setSubScreen] = useState<SubScreen>('main');
    const [client, setClient] = useState<any>(null);

    // Data States
    const [appointments, setAppointments] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [rewards, setRewards] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);

    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        email: '',
        birthDate: ''
    });

    const primaryColor = tenant?.settings?.app_config?.general?.primaryColor || '#eab308';

    useEffect(() => {
        loadClientData();
    }, [clientData]);

    const loadClientData = async () => {
        try {
            if (clientData?.clientId) {
                // 1. Carregar perfil
                const clientInfo = await clientService.getById(clientData.clientId);
                if (clientInfo) {
                    setClient(clientInfo);
                    setEditData({
                        name: clientInfo.name || '',
                        email: clientInfo.email || '',
                        birthDate: clientInfo.birth_date || ''
                    });
                }

                // 2. Carregar dados das sub-telas em paralelo
                const [apts, purds, rwrds, notifs] = await Promise.all([
                    clientService.getAppointments(clientData.clientId),
                    clientService.getPurchases(clientData.clientId),
                    clientService.getRedeemedRewards(clientData.clientId),
                    clientService.getNotifications(clientData.clientId)
                ]);

                setAppointments(apts);
                setPurchases(purds);
                setRewards(rwrds);
                setNotifications(notifs);

                // Verificar status do Push
                const isSubscribed = await clientService.checkPushSubscription();
                setPushEnabled(isSubscribed);
            }
        } catch (error) {
            console.error('Error loading client data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnablePush = async () => {
        if (!clientData?.clientId) return;
        setPushLoading(true);
        try {
            await clientService.subscribeToPush(clientData.clientId, tenant.id);
            setPushEnabled(true);
            alert('✅ Notificações ativadas com sucesso!');
        } catch (error: any) {
            console.error('Push error:', error);
            alert('Erro ao ativar notificações. Verifique as permissões do seu navegador.');
        } finally {
            setPushLoading(false);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!clientData?.clientId || notifications.length === 0) return;
        try {
            await clientService.markAllAsRead(clientData.clientId);
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await clientService.updateProfile(clientData.clientId, {
                name: editData.name,
                email: editData.email,
                birth_date: editData.birthDate
            });

            setClient({ ...client, ...editData });
            setEditing(false);
            alert('✅ Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Update error:', error);
            alert('Erro ao atualizar perfil.');
        }
    };

    const handleLogout = () => {
        const confirm = window.confirm('Deseja realmente sair?');
        if (confirm) {
            onLogout();
        }
    };

    const getInitials = (name: string) => {
        return name
            ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U';
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
            </div>
        );
    }

    // Render Logic
    return (
        <div className="min-h-screen bg-gray-950 pb-24">
            {subScreen === 'main' ? (
                <>
                    {/* Header Main */}
                    <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
                        <h1 className="text-xl font-bold text-white">Meu Perfil</h1>
                    </div>

                    <div className="p-6 space-y-6 animate-in fade-in duration-300">
                        {/* Avatar Card */}
                        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                            <div
                                className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-dark-950 ring-4 ring-gray-800"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {client?.avatar_url ? (
                                    <img src={client.avatar_url} alt={client.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    getInitials(client?.name)
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-white">{client?.name}</h2>
                            <p className="text-gray-400 text-sm mb-4">
                                Cliente desde {client?.created_at ? new Date(client.created_at).getFullYear() : new Date().getFullYear()}
                            </p>

                            <div className="grid grid-cols-3 gap-4 border-t border-gray-800 pt-4">
                                <div>
                                    <p className="text-lg font-bold text-white">{appointments.length}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Cortes</p>
                                </div>
                                <div className="border-l border-gray-800">
                                    <p className="text-lg font-bold text-white">{purchases.length}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Compras</p>
                                </div>
                                <div className="border-l border-gray-800">
                                    <p className="text-lg font-bold text-white">{client?.loyalty_points || 0}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pontos</p>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Status Card */}
                        {client?.subscription_status === 'active' ? (
                            <div className="bg-gradient-to-br from-primary-600/20 to-primary-900/40 rounded-2xl p-4 border border-primary-500/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary-500 rounded-xl text-dark-950">
                                        <Crown size={20} />
                                    </div>
                                    <div>
                                        <p className="text-primary-500 font-bold text-sm">Assinante VIP</p>
                                        <p className="text-[10px] text-gray-400">Renovação em {formatDate(client.subscription_renews_at)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/plans')}
                                    className="text-xs font-bold text-white bg-white/10 px-3 py-2 rounded-lg hover:bg-white/20 transition-all"
                                >
                                    Gerenciar
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => navigate('/plans')}
                                className="bg-gray-900 rounded-2xl p-4 border border-gray-800 flex items-center justify-between group cursor-pointer hover:border-primary-500/30 transition-all relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-8 bg-primary-500/5 rounded-full blur-2xl -mr-4 -mt-4"></div>
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="p-2.5 bg-gray-800 rounded-xl text-primary-500 group-hover:scale-110 transition-transform">
                                        <Crown size={20} />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">Seja VIP</p>
                                        <p className="text-[10px] text-gray-400">Garanta descontos e agenda prioritária</p>
                                    </div>
                                </div>
                                <ArrowLeft className="rotate-180 text-gray-600 group-hover:text-primary-500 transition-colors" size={20} />
                            </div>
                        )}
                        <div className="space-y-3">
                            <button
                                onClick={() => setSubScreen('history')}
                                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                                        <Clock size={20} className="text-blue-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-white">Histórico de Cortes</p>
                                        <p className="text-xs text-gray-400">Ver agendamentos passados</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-600" />
                            </button>

                            <button
                                onClick={() => setSubScreen('purchases')}
                                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                                        <ShoppingBag size={20} className="text-emerald-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-white">Minhas Compras</p>
                                        <p className="text-xs text-gray-400">Produtos adquiridos</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-600" />
                            </button>

                            <button
                                onClick={() => setSubScreen('rewards')}
                                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                                        <Gift size={20} className="text-purple-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-white">Prêmios Resgatados</p>
                                        <p className="text-xs text-gray-400">Ver meus resgates</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-600" />
                            </button>

                            <button
                                onClick={() => setSubScreen('notifications')}
                                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                                        <Bell size={20} className="text-yellow-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-white">Notificações</p>
                                        <p className="text-xs text-gray-400">Avisos e novidades</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {notifications.some(n => !n.is_read) && (
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    )}
                                    <ChevronRight size={20} className="text-gray-600" />
                                </div>
                            </button>
                        </div>

                        {/* Quick Edit Profile Inline */}
                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-sm uppercase tracking-wider">Meus Dados</h3>
                                <button
                                    onClick={() => setEditing(!editing)}
                                    className="text-xs font-bold flex items-center gap-1 hover:text-white transition-colors"
                                    style={{ color: primaryColor }}
                                >
                                    <Edit2 size={12} />
                                    {editing ? 'CANCELAR' : 'EDITAR'}
                                </button>
                            </div>

                            {editing ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Nome</label>
                                        <input
                                            type="text"
                                            value={editData.name}
                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-white focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">E-mail</label>
                                        <input
                                            type="email"
                                            value={editData.email}
                                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-white focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Data de Nascimento</label>
                                        <input
                                            type="date"
                                            value={editData.birthDate}
                                            onChange={(e) => setEditData({ ...editData, birthDate: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-white focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveProfile}
                                        className="w-full py-3 rounded-lg font-bold text-dark-950 mt-2 hover:brightness-110 transition-all"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        Salvar Alterações
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        <Phone size={16} className="text-gray-500" />
                                        <span className="text-gray-300">{client?.phone}</span>
                                    </div>
                                    {client?.email && (
                                        <div className="flex items-center gap-3">
                                            <Mail size={16} className="text-gray-500" />
                                            <span className="text-gray-300">{client.email}</span>
                                        </div>
                                    )}
                                    {client?.birth_date && (
                                        <div className="flex items-center gap-3">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-gray-300">{formatDate(client.birth_date)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="w-full py-4 bg-gray-900 border border-gray-800 text-red-400 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                        >
                            <LogOut size={18} />
                            Sair da Conta
                        </button>

                        <p className="text-center text-xs text-gray-600 pt-4">
                            Versão 2.1.0 • ID: {client?.id?.slice(0, 8)}
                        </p>
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
                    {/* Header Subscreen */}
                    <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
                        <button
                            onClick={() => setSubScreen('main')}
                            className="p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-lg font-bold text-white">
                            {subScreen === 'history' && 'Histórico de Cortes'}
                            {subScreen === 'purchases' && 'Minhas Compras'}
                            {subScreen === 'rewards' && 'Prêmios Resgatados'}
                            {subScreen === 'notifications' && 'Notificações'}
                        </h2>
                    </div>

                    <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                        {/* History Subscreen */}
                        {subScreen === 'history' && (
                            appointments.length > 0 ? (
                                <div className="space-y-3">
                                    {appointments.map(apt => (
                                        <div key={apt.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex justify-between items-start">
                                            <div>
                                                <p className="text-white font-bold">{apt.service?.name}</p>
                                                <p className="text-gray-400 text-sm">Profissional: <span className="text-gray-300">{apt.barber?.name}</span></p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                                        ${apt.status === 'Agendado' ? 'bg-blue-500/20 text-blue-400' :
                                                            apt.status === 'Concluído' ? 'bg-green-500/20 text-green-400' :
                                                                'bg-red-500/20 text-red-400'}`}>
                                                        {apt.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-medium">{formatDate(apt.date)}</p>
                                                <p className="text-gray-500 text-sm">{apt.start_time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                    Nenhum agendamento encontrado
                                </div>
                            )
                        )}

                        {/* Purchases Subscreen */}
                        {subScreen === 'purchases' && (
                            purchases.length > 0 ? (
                                <div className="space-y-3">
                                    {purchases.map((purchase, idx) => (
                                        <div key={idx} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                                                <Package size={20} className="text-emerald-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-bold">{purchase.name}</p>
                                                <p className="text-gray-400 text-xs">{formatDate(purchase.date)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-emerald-400 font-bold">R$ {purchase.price?.toFixed(2)}</p>
                                                <p className="text-gray-600 text-xs">x{purchase.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                                    Nenhuma compra realizada ainda
                                </div>
                            )
                        )}

                        {/* Rewards Subscreen */}
                        {subScreen === 'rewards' && (
                            rewards.length > 0 ? (
                                <div className="space-y-3">
                                    {rewards.map(reward => (
                                        <div key={reward.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                                            <div className="flex justify-between mb-2">
                                                <h3 className="text-white font-bold">{reward.reward_title}</h3>
                                                <span className="text-yellow-400 font-bold text-sm">-{reward.points_cost} pts</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400">Resgatado em {formatDate(reward.created_at)}</span>
                                                <span className={`px-2 py-1 rounded font-bold uppercase ${reward.status === 'delivered' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {reward.status === 'delivered' ? 'Entregue' : 'Pendente'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <Gift size={48} className="mx-auto mb-4 opacity-20" />
                                    Você ainda não resgatou prêmios
                                </div>
                            )
                        )}

                        {/* Notifications Subscreen */}
                        {subScreen === 'notifications' && (
                            <div className="space-y-4">
                                {/* Push Activation Header */}
                                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-gray-800 relative overflow-hidden group">
                                    <div className="flex items-center justify-between gap-4 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${pushEnabled ? 'bg-green-500/10 text-green-500' : 'bg-primary-500/10 text-primary-500'}`}>
                                                <Smartphone size={18} />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold text-sm">Alertas no Celular</h3>
                                                <p className="text-gray-500 text-[10px]">{pushEnabled ? 'Você já está recebendo lembretes' : 'Receba avisos de agendamentos'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleEnablePush}
                                            disabled={pushEnabled || pushLoading}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                                ${pushEnabled ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-primary-500 text-dark-950 hover:scale-105 active:scale-95'}`}
                                        >
                                            {pushLoading ? '...' : (pushEnabled ? 'Ativado ✓' : 'Ativar')}
                                        </button>
                                    </div>
                                </div>

                                {notifications.length > 0 && notifications.some(n => !n.is_read) && (
                                    <div className="flex justify-end px-2">
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
                                            style={{ color: primaryColor }}
                                        >
                                            Marcar todas como lidas
                                        </button>
                                    </div>
                                )}

                                {notifications.length > 0 ? (
                                    <div className="space-y-3">
                                        {notifications.map(notif => (
                                            <div
                                                key={notif.id}
                                                className={`p-5 rounded-2xl border transition-all relative overflow-hidden group
                                                    ${notif.is_read ? 'bg-gray-900/50 border-gray-800/50' : 'bg-gray-900 border-gray-800'}`}
                                                onClick={async () => {
                                                    if (!notif.is_read) {
                                                        await clientService.markAsRead(notif.id);
                                                        setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                                                    }
                                                }}
                                            >
                                                {!notif.is_read && (
                                                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: primaryColor }}></div>
                                                )}
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <h4 className={`font-bold mb-1 transition-colors ${notif.is_read ? 'text-gray-400' : 'text-white'}`}>
                                                            {notif.title}
                                                        </h4>
                                                        <p className={`text-sm leading-relaxed ${notif.is_read ? 'text-gray-500' : 'text-gray-400'}`}>
                                                            {notif.message}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-4">
                                                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{formatDate(notif.created_at)}</span>
                                                    {!notif.is_read && (
                                                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20">
                                        <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800/50">
                                            <Bell size={32} className="text-gray-800" />
                                        </div>
                                        <p className="text-gray-600 font-bold text-xs uppercase tracking-[0.2em]">Nenhuma notificação nova</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientProfile;
