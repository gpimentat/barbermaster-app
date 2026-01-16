import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, Calendar, LogOut, Clock, Star, Edit2 } from 'lucide-react';
import clientService from '../../src/services/clientService';

interface ClientProfileProps {
    tenant: any;
    clientData: any;
    onLogout: () => void;
}

const ClientProfile: React.FC<ClientProfileProps> = ({ tenant, clientData, onLogout }) => {
    const [client, setClient] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
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
                // Carregar dados do cliente
                const clientInfo = await clientService.getById(clientData.clientId);
                if (clientInfo) {
                    setClient(clientInfo);
                    setEditData({
                        name: clientInfo.name || '',
                        email: clientInfo.email || '',
                        birthDate: clientInfo.birth_date || ''
                    });
                }

                // Carregar histórico de agendamentos
                const apts = await clientService.getAppointments(clientData.clientId);
                setAppointments(apts.slice(0, 5)); // Últimos 5
            }
        } catch (error) {
            console.error('Error loading client data:', error);
        } finally {
            setLoading(false);
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
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
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

    return (
        <div className="min-h-screen bg-gray-950 pb-24">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
                <h1 className="text-xl font-bold text-white">Meu Perfil</h1>
            </div>

            <div className="p-6 space-y-6">
                {/* Avatar e Info */}
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center">
                    <div
                        className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-dark-950"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {client?.avatar_url ? (
                            <img src={client.avatar_url} alt={client.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            getInitials(client?.name || 'U')
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white">{client?.name}</h2>
                    <p className="text-gray-400 text-sm">
                        Cliente desde {new Date(client?.created_at).getFullYear()}
                    </p>

                    <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-800">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{appointments.length}</p>
                            <p className="text-xs text-gray-400">Cortes</p>
                        </div>
                        <div className="w-px h-10 bg-gray-800"></div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{client?.loyalty_points || 0}</p>
                            <p className="text-xs text-gray-400">Pontos</p>
                        </div>
                    </div>
                </div>

                {/* Dados Pessoais */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold">Dados Pessoais</h3>
                        <button
                            onClick={() => setEditing(!editing)}
                            className="text-sm font-medium flex items-center gap-1"
                            style={{ color: primaryColor }}
                        >
                            <Edit2 size={14} />
                            {editing ? 'Cancelar' : 'Editar'}
                        </button>
                    </div>

                    {editing ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">E-mail</label>
                                <input
                                    type="email"
                                    value={editData.email}
                                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Data de Nascimento</label>
                                <input
                                    type="date"
                                    value={editData.birthDate}
                                    onChange={(e) => setEditData({ ...editData, birthDate: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                />
                            </div>
                            <button
                                onClick={handleSaveProfile}
                                className="w-full py-2 rounded-lg font-bold text-dark-950"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Phone size={18} className="text-gray-400" />
                                <span className="text-gray-300">{client?.phone}</span>
                            </div>
                            {client?.email && (
                                <div className="flex items-center gap-3">
                                    <Mail size={18} className="text-gray-400" />
                                    <span className="text-gray-300">{client.email}</span>
                                </div>
                            )}
                            {client?.birth_date && (
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-gray-400" />
                                    <span className="text-gray-300">{formatDate(client.birth_date)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Histórico */}
                {appointments.length > 0 && (
                    <div>
                        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                            <Clock size={18} style={{ color: primaryColor }} />
                            Histórico de Agendamentos
                        </h3>
                        <div className="space-y-2">
                            {appointments.map(apt => (
                                <div key={apt.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-white font-bold">{apt.service?.name || 'Serviço'}</p>
                                            <p className="text-gray-400 text-sm">Com {apt.barber?.name || 'Barbeiro'}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span
                                                    className="px-2 py-1 rounded text-xs font-medium"
                                                    style={{
                                                        backgroundColor: apt.status === 'completed' ? '#10b98120' : apt.status === 'cancelled' ? '#ef444420' : `${primaryColor}20`,
                                                        color: apt.status === 'completed' ? '#10b981' : apt.status === 'cancelled' ? '#ef4444' : primaryColor
                                                    }}
                                                >
                                                    {apt.status === 'completed' ? '✓ Concluído' : apt.status === 'cancelled' ? '✗ Cancelado' : '⏱ Pendente'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-300 text-sm">{formatDate(apt.date)}</p>
                                            <p className="text-gray-500 text-xs">{apt.time}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Botão Sair */}
                <button
                    onClick={handleLogout}
                    className="w-full py-3 bg-red-500/20 border-2 border-red-500 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/30 transition-colors"
                >
                    <LogOut size={18} />
                    Sair da Conta
                </button>
            </div>
        </div>
    );
};

export default ClientProfile;
