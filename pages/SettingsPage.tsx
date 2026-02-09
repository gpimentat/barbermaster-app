import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Save, Camera, Mail, Lock, CheckCircle, Smartphone, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { supabase } from '../src/supabaseClient';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const SettingsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile Form Data
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        bio: '',
        phone: ''
    });

    // Password Form Data
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    // Real Notifications Data from DB
    const [notifSettings, setNotifSettings] = useState<any[]>([]);
    const [pushEnabled, setPushEnabled] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name,
                email: currentUser.email,
                bio: 'Profissional BarberMaster', // Mock field if not in DB
                phone: currentUser.phone || ''    // Mock field if not in DB
            });
            fetchNotifSettings();
            checkPushSubscription();
        }
    }, [currentUser]);

    const fetchNotifSettings = async () => {
        if (!currentUser) return;
        const { data, error } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('user_id', currentUser.id);

        if (!error && data) {
            setNotifSettings(data);
        }
    };

    const checkPushSubscription = async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setPushEnabled(!!subscription);
        }
    };

    const handleToggleNotif = async (type: string, currentEnabled: boolean) => {
        if (!currentUser) return;

        const { error } = await supabase
            .from('notification_settings')
            .upsert({
                user_id: currentUser.id,
                type,
                enabled: !currentEnabled,
                tenant_id: currentUser.tenantId
            }, { onConflict: 'user_id,type' });

        if (!error) {
            fetchNotifSettings();
        }
    };

    const handleRegisterPush = async () => {
        if (pushEnabled) {
            // Unsubscribe logic (optional for now, let's keep it simple)
            alert("Você já está inscrito para receber notificações push.");
            return;
        }

        try {
            setLoading(true);
            const registration = await navigator.serviceWorker.ready;

            // Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permissão de notificação negada.');
            }

            // In a real app, you'd get the public VAPID key from the server
            // For now, I'll use a placeholder or assume the user will set it up.
            // But to make it work, we need a real subscription.
            // Chave VAPID Pública (Nova chave gerada)
            const VAPID_PUBLIC_KEY = 'BNqc8pq8BmuX53io0S4Bg9D1XUhkGZvRQCvHzG_FaH3hPV1bauVC7Z0tbrw9rRcO91AKmWFccANx9uKiYxps9f8';
            const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            const { error } = await supabase
                .from('push_subscriptions')
                .insert([{
                    user_id: currentUser?.id,
                    subscription: subscription.toJSON(),
                    tenant_id: currentUser?.tenantId
                }]);

            if (error) throw error;
            setPushEnabled(true);
            setMessage({ type: 'success', text: 'Notificações push ativadas com sucesso!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Erro ao ativar notificações: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ name: formData.name }) // Add other fields if schema supports
                .eq('id', currentUser?.id);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            window.location.reload(); // Simple reload to refresh context
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            setLoading(false);
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async () => {
        alert("Funcionalidade de upload de imagem será implementada com Storage.");
        // TODO: Implement Storage Bucket logic
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in pb-20">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white">Configurações</h1>
                <p className="text-gray-400">Gerencie seu perfil e segurança.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Menu Lateral */}
                <div className="md:col-span-1 space-y-2">
                    <button
                        onClick={() => { setActiveTab('profile'); setMessage(null); }}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-all ${activeTab === 'profile' ? 'bg-gray-800 text-white border-l-4 border-primary-500 shadow-md' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
                    >
                        <User size={18} /> Meu Perfil
                    </button>
                    <button
                        onClick={() => { setActiveTab('security'); setMessage(null); }}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-all ${activeTab === 'security' ? 'bg-gray-800 text-white border-l-4 border-primary-500 shadow-md' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
                    >
                        <Shield size={18} /> Segurança
                    </button>
                    <button
                        onClick={() => { setActiveTab('notifications'); setMessage(null); }}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-all ${activeTab === 'notifications' ? 'bg-gray-800 text-white border-l-4 border-primary-500 shadow-md' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
                    >
                        <Bell size={18} /> Notificações
                    </button>
                </div>

                {/* Área de Conteúdo */}
                <div className="md:col-span-3 bg-dark-900 border border-gray-800 rounded-xl p-6 min-h-[500px]">

                    {message && (
                        <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                            {message.type === 'success' ? <CheckCircle size={20} /> : <Shield size={20} />}
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-4">Editar Perfil</h2>

                            <div className="flex items-center gap-6">
                                <div className="relative group cursor-pointer" onClick={handleAvatarUpload}>
                                    <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 overflow-hidden flex items-center justify-center">
                                        {currentUser?.avatar ? (
                                            <img src={currentUser.avatar} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl font-bold text-primary-500">{currentUser?.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="text-white" size={24} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">{currentUser?.name}</h3>
                                    <p className="text-sm text-gray-400">{currentUser?.role}</p>
                                    <p className="text-xs text-primary-500 mt-1 cursor-pointer hover:underline" onClick={handleAvatarUpload}>Alterar foto de perfil</p>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Nome Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-dark-950 border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">E-mail</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                disabled
                                                className="w-full bg-dark-950/50 border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                    {/* 
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Telefone (Opcional)</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input 
                                        type="tel" 
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        className="w-full bg-dark-950 border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-primary-500 focus:outline-none" 
                                    />
                                </div>
                            </div>
                             */}
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-all shadow-lg shadow-primary-500/10 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                                    >
                                        <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-4">Segurança da Conta</h2>

                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                                <h4 className="text-yellow-500 font-bold flex items-center gap-2 mb-2">
                                    <Shield size={18} /> Recomendação
                                </h4>
                                <p className="text-sm text-gray-400">
                                    Use uma senha forte com pelo menos 8 caracteres, incluindo números e símbolos. Nunca compartilhe sua senha.
                                </p>
                            </div>

                            <form onSubmit={handleUpdatePassword} className="max-w-md space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Nova Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full bg-dark-950 border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-primary-500 focus:outline-none transition-all"
                                            placeholder="Digita a nova senha"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Confirmar Nova Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full bg-dark-950 border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-primary-500 focus:outline-none transition-all"
                                            placeholder="Repita a nova senha"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading || !passwordData.newPassword}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-all border border-gray-700 disabled:opacity-50"
                                    >
                                        <Shield size={18} /> {loading ? 'Atualizando...' : 'Atualizar Senha'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-4">Preferências de Notificação</h2>

                            {/* Push Activation */}
                            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-6 mb-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-primary-500 font-bold text-lg flex items-center gap-2">
                                            <Smartphone size={20} /> Notificações Reais no Celular
                                        </h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Receba avisos mesmo com o app fechado para não perder nada.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleRegisterPush}
                                        disabled={pushEnabled || loading}
                                        className={`px-6 py-2 rounded-lg font-bold transition-all ${pushEnabled ? 'bg-green-500/20 text-green-500 border border-green-500/40 cursor-default' : 'bg-primary-500 hover:bg-primary-600 text-dark-950 shadow-lg shadow-primary-500/20'}`}
                                    >
                                        {pushEnabled ? 'Ativado ✓' : 'Ativar Push'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Barbeiro: Metas e Agenda */}
                                {(currentUser?.role === 'barber' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                                    <>
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-6">Para Profissionais</h3>
                                        <div className="flex items-center justify-between p-4 bg-dark-950 rounded-lg border border-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
                                                    <Bell size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">Meta da Semana Atingida</h4>
                                                    <p className="text-xs text-gray-500">Saber o momento exato que bateu sua meta.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggleNotif('goal_reached', notifSettings.find(s => s.type === 'goal_reached')?.enabled || false)}
                                                className={`w-12 h-6 rounded-full relative transition-colors ${notifSettings.find(s => s.type === 'goal_reached')?.enabled ? 'bg-primary-500' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifSettings.find(s => s.type === 'goal_reached')?.enabled ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-dark-950 rounded-lg border border-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                                    <CheckCircle size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">Agenda Cheia</h4>
                                                    <p className="text-xs text-gray-500">Notificar quando a agenda do dia estiver 100% ocupada.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggleNotif('full_schedule', notifSettings.find(s => s.type === 'full_schedule')?.enabled || false)}
                                                className={`w-12 h-6 rounded-full relative transition-colors ${notifSettings.find(s => s.type === 'full_schedule')?.enabled ? 'bg-primary-500' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifSettings.find(s => s.type === 'full_schedule')?.enabled ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-dark-950 rounded-lg border border-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                                    <Calendar size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">Novo Agendamento</h4>
                                                    <p className="text-xs text-gray-500">Aviso imediato quando um cliente marca com você.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggleNotif('new_appointment', notifSettings.find(s => s.type === 'new_appointment')?.enabled || false)}
                                                className={`w-12 h-6 rounded-full relative transition-colors ${notifSettings.find(s => s.type === 'new_appointment')?.enabled ? 'bg-primary-500' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifSettings.find(s => s.type === 'new_appointment')?.enabled ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-dark-950 rounded-lg border border-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                                                    <TrendingUp size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">Progresso da Meta</h4>
                                                    <p className="text-xs text-gray-500">Resumo do seu desempenho ao final do expediente.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggleNotif('goal_progress', notifSettings.find(s => s.type === 'goal_progress')?.enabled || false)}
                                                className={`w-12 h-6 rounded-full relative transition-colors ${notifSettings.find(s => s.type === 'goal_progress')?.enabled ? 'bg-primary-500' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifSettings.find(s => s.type === 'goal_progress')?.enabled ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Admin: Faturamento e Comissões */}
                                {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                                    <>
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-6">Para Administradores</h3>
                                        <div className="flex items-center justify-between p-4 bg-dark-950 rounded-lg border border-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                                                    <Save size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">Relatório de Faturamento Diário</h4>
                                                    <p className="text-xs text-gray-500">Resumo financeiro ao final do dia.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggleNotif('daily_revenue', notifSettings.find(s => s.type === 'daily_revenue')?.enabled || false)}
                                                className={`w-12 h-6 rounded-full relative transition-colors ${notifSettings.find(s => s.type === 'daily_revenue')?.enabled ? 'bg-primary-500' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifSettings.find(s => s.type === 'daily_revenue')?.enabled ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-dark-950 rounded-lg border border-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                                                    <Bell size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">Aviso de Comissões Pendentes</h4>
                                                    <p className="text-xs text-gray-500">Alerta quando houver comissões prontas para pagamento.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggleNotif('commission_alert', notifSettings.find(s => s.type === 'commission_alert')?.enabled || false)}
                                                className={`w-12 h-6 rounded-full relative transition-colors ${notifSettings.find(s => s.type === 'commission_alert')?.enabled ? 'bg-primary-500' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifSettings.find(s => s.type === 'commission_alert')?.enabled ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
