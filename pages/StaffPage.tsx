
import React, { useState, useRef } from 'react';
import { Star, MoreHorizontal, Plus, X, Save, DollarSign, Percent, User, Briefcase, Upload, Image as ImageIcon, Trash2, Lock, Shield, CheckSquare, Square, Check, Mail, KeyRound } from 'lucide-react';
import { Barber } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../src/supabaseClient';

// Definição das permissões disponíveis no sistema
const SYSTEM_PERMISSIONS = [
  { id: 'view_own_schedule', label: 'Ver Própria Agenda' },
  { id: 'view_full_schedule', label: 'Ver Agenda Completa (Todos)' },
  { id: 'manage_schedule', label: 'Criar/Editar Agendamentos' },
  { id: 'manage_waitlist', label: 'Gerenciar Fila de Espera' }, // Nova Permissão
  { id: 'manage_clients', label: 'Gerenciar Base de Clientes' },
  { id: 'manage_products', label: 'Gerenciar Estoque/Produtos' },
  { id: 'manage_comandas', label: 'Abrir e Fechar Comandas' },
  { id: 'view_own_commissions', label: 'Ver Próprias Comissões' },
  { id: 'view_financial', label: 'Acesso Financeiro Total (Admin)' },
  { id: 'manage_integrations', label: 'Gerenciar Integrações (WhatsApp)' },
];

const StaffPage: React.FC = () => {
  // AGORA USAMOS O CONTEXTO GLOBAL
  const { barbers, updateBarber, addBarber, currentUser } = useAuth();

  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false); // Nova variável para controle de exclusão sem popup
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper para abrir modal de criação
  const handleAddNew = () => {
    setSelectedBarber({
      id: Date.now().toString(),
      name: '',
      email: '',
      password: '1234', // SENHA PADRÃO "1234"
      mustChangePassword: true, // Força troca no primeiro acesso
      role: '',
      avatar: '',
      active: true,
      commissionRate: 0,
      loginEnabled: false,
      permissions: []
    });
  };

  // Helper para abrir modal de edição
  const handleEdit = (barber: Barber) => {
    // Garante que permissions array exista e cria uma cópia para edição
    setSelectedBarber({
      ...barber,
      permissions: barber.permissions || [],
      loginEnabled: barber.loginEnabled || false
    });
  };

  // Helper para salvar
  const handleSave = async () => {
    console.log('--- Iniciando Salvamento ---');
    if (!selectedBarber) return;

    // VALIDATION
    if (!selectedBarber.name) {
      alert('ERRO: O nome é obrigatório.');
      return;
    }
    if (selectedBarber.loginEnabled && !selectedBarber.email) {
      alert('ERRO: O e-mail é obrigatório para login.');
      return;
    }
    if (!selectedBarber.role) {
      alert('ERRO: O cargo é obrigatório.');
      return;
    }

    try {
      // Prepare Tenant ID
      let tenantIdToSend = currentUser?.tenantId;
      // Fallback hardcoded if missing/invalid
      if (!tenantIdToSend || tenantIdToSend === 'temp' || tenantIdToSend.length < 20) {
        console.warn('Tenant ID inválido no contexto. Usando fallback.');
        tenantIdToSend = '63f22a97-eb14-4862-93b6-815ca41b83a4';
      }

      console.log('Enviando dados para Edge Function:', {
        id: selectedBarber.id.length > 30 ? selectedBarber.id : 'NOVO',
        name: selectedBarber.name,
        email: selectedBarber.email,
        tenantId: tenantIdToSend
      });

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-staff`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selectedBarber.id.length > 30 ? selectedBarber.id : null,
            name: selectedBarber.name,
            email: selectedBarber.email,
            password: selectedBarber.password || null,
            role: selectedBarber.role,
            avatar: selectedBarber.avatar || null,
            active: selectedBarber.active,
            commission_rate: selectedBarber.commissionRate || 0,
            permissions: selectedBarber.permissions || [],
            login_enabled: selectedBarber.loginEnabled || false,
            tenant_id: tenantIdToSend
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      console.log('Sucesso Edge Function:', result);
      alert('✅ Profissional salvo com sucesso!');
      addBarber(selectedBarber);
      setSelectedBarber(null);

    } catch (error: any) {
      console.error('Catch Error Full:', error);

      let errorMsg = 'Erro desconhecido';
      if (typeof error === 'string') errorMsg = error;
      else if (error.message) errorMsg = error.message;
      else if (error.error_description) errorMsg = error.error_description;

      const details = error.details || error.hint || JSON.stringify(error, null, 2);

      alert(`❌ FALHA AO SALVAR\n\nMensagem: ${errorMsg}\n\nDetalhes Técnicos: ${details}\n\nVerifique o console (F12) para mais dados.`);
    }
  };

  const handleDelete = async (id: string) => {
    // Confirmação já feita via UI
    // if (!window.confirm(...)) return;  <-- REMOVIDO PARA EVITAR BLOQUEIO DE POPUP


    try {
      // Usando lógica direta com verificação de contagem
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)
        .select(); // Request return data to confirm deletion

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('⚠️ ATENÇÃO: O banco de dados não retornou confirmação.\n\nPode ser que:\n1. O registro já foi excluído.\n2. Você não tem permissão (RLS).\n3. Existe um bloqueio oculto.');
        return;
      }

      alert('✅ Profissional excluído com sucesso! A página será recarregada.');
      window.location.reload(); // FORÇAR RECARREGAMENTO REAL
      setSelectedBarber(null);

    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      alert(`❌ FALHA AO EXCLUIR: ${error.message || JSON.stringify(error)}`);
    }
  };

  const updateField = (field: keyof Barber, value: any) => {
    if (selectedBarber) {
      setSelectedBarber({ ...selectedBarber, [field]: value });
    }
  };

  const togglePermission = (permissionId: string) => {
    if (!selectedBarber) return;

    setSelectedBarber(prev => {
      if (!prev) return null;
      const currentPermissions = prev.permissions || [];
      const exists = currentPermissions.includes(permissionId);

      let newPermissions;
      if (exists) {
        newPermissions = currentPermissions.filter(p => p !== permissionId);
      } else {
        newPermissions = [...currentPermissions, permissionId];
      }

      return { ...prev, permissions: newPermissions };
    });
  };

  const applyPreset = (type: 'barber' | 'receptionist' | 'admin') => {
    let presets: string[] = [];
    if (type === 'barber') {
      // Barbeiro: vê própria agenda, mexe na agenda, vê clientes, vê comissão dele
      presets = ['view_own_schedule', 'manage_schedule', 'manage_clients', 'view_own_commissions'];
    } else if (type === 'receptionist') {
      // Recepção: vê tudo operacional, mas não financeiro admin ou comissões pessoais
      presets = ['view_full_schedule', 'manage_schedule', 'manage_waitlist', 'manage_clients', 'manage_products', 'manage_comandas', 'manage_integrations'];
    } else if (type === 'admin') {
      // Admin: tudo
      presets = SYSTEM_PERMISSIONS.map(p => p.id);
    }

    // Atualiza o estado forçando também o loginEnabled como true e Role sugerido
    if (selectedBarber) {
      setSelectedBarber({
        ...selectedBarber,
        permissions: presets,
        loginEnabled: true,
        role: type === 'barber' ? 'Barbeiro' : type === 'receptionist' ? 'Recepcionista' : 'Gerente'
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      updateField('avatar', imageUrl);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    updateField('avatar', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Profissionais</h1>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-primary-500/20"
        >
          <Plus size={20} />
          Adicionar Profissional
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barbers.map((barber) => (
          <div key={barber.id} className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden group hover:border-primary-500/30 transition-all">
            <div className="h-24 bg-gradient-to-r from-gray-800 to-gray-900 relative">
              <button
                onClick={() => handleEdit(barber)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Editar Profissional"
              >
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="px-6 pb-6">
              <div className="relative -top-12 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full border-4 border-dark-900 overflow-hidden bg-gray-800 shadow-lg">
                  <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="mt-3 text-xl font-bold text-white">{barber.name}</h3>
                <div className="flex flex-col items-center">
                  <p className="text-primary-500 font-medium">{barber.role}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{barber.email}</p>
                </div>
                <div className="flex items-center gap-1 mt-2 text-gray-400 text-sm">
                  <span className={`w-2 h-2 rounded-full ${barber.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {barber.active ? 'Ativo' : 'Inativo'}
                  {barber.loginEnabled && <span className="ml-2 text-xs bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 flex items-center gap-1"><Lock size={10} /> Acesso Liberado</span>}
                </div>
              </div>

              <div className="mt-2 flex justify-center">
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-800 flex flex-col items-center justify-center w-32">
                  <div className="flex items-center text-white font-bold text-lg gap-1">
                    {barber.commissionRate}<Percent size={14} className="text-primary-500" />
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Comissão</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center text-sm">
                <div className="flex items-center gap-1 text-yellow-500 font-medium">
                  <Star size={16} fill="currentColor" />
                  <span>4.9</span>
                  <span className="text-gray-500 font-normal ml-1">(120 reviews)</span>
                </div>
                <button onClick={() => handleEdit(barber)} className="text-primary-500 hover:text-primary-400 font-medium hover:underline">
                  Ver Permissões
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Edição */}
      {selectedBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-white">
                {barbers.some(b => b.id === selectedBarber.id) ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button
                onClick={() => setSelectedBarber(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Coluna Esquerda: Foto e Info Básica */}
                <div className="md:col-span-1 space-y-4">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      accept="image/*"
                    />

                    <div className="relative group">
                      <div
                        onClick={triggerFileInput}
                        className={`w-32 h-32 rounded-full border-4 flex items-center justify-center overflow-hidden cursor-pointer transition-all ${selectedBarber.avatar
                          ? 'border-gray-700 hover:border-primary-500'
                          : 'border-dashed border-gray-600 hover:border-primary-500 bg-gray-800'
                          }`}
                      >
                        {selectedBarber.avatar ? (
                          <img src={selectedBarber.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-gray-500">
                            <Upload size={24} />
                            <span className="text-[10px] uppercase font-bold mt-1">Foto</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                          <span className="text-white text-xs font-bold flex items-center gap-1"><ImageIcon size={14} /> Trocar</span>
                        </div>
                      </div>
                      {selectedBarber.avatar && (
                        <button type="button" onClick={removeImage} className="absolute bottom-0 right-0 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-20">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                    <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-lg border border-gray-700">
                      <input
                        type="checkbox"
                        id="activeCheck"
                        checked={selectedBarber.active}
                        onChange={(e) => updateField('active', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 text-primary-500 focus:ring-primary-500 bg-gray-700 cursor-pointer"
                      />
                      <label htmlFor="activeCheck" className="text-white cursor-pointer select-none text-sm">Disponível na Agenda</label>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Dados Cadastrais */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 text-gray-500" size={18} />
                      <input
                        type="text"
                        value={selectedBarber.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500"
                        placeholder="Ex: João Silva"
                      // removed required, manual check
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">E-mail de Acesso</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 text-gray-500" size={18} />
                      <input
                        type="email"
                        value={selectedBarber.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500"
                        placeholder="Ex: profissional@barbermaster.com"
                      // removed required logic handled manually
                      />
                    </div>
                    {selectedBarber.loginEnabled && (
                      <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                        <KeyRound size={10} /> Senha inicial será definida como "1234" se for um novo cadastro.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Cargo / Especialidade</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-2.5 text-gray-500" size={18} />
                      <input
                        type="text"
                        value={selectedBarber.role}
                        onChange={(e) => updateField('role', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500"
                        placeholder="Ex: Master Barber, Recepcionista"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Comissão Padrão (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedBarber.commissionRate}
                        onChange={(e) => updateField('commissionRate', parseFloat(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-4 pr-8 py-2 text-white focus:outline-none focus:border-primary-500"
                      />
                      <Percent className="absolute right-3 top-2.5 text-gray-500" size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Permissões e Login */}
              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield size={20} className="text-primary-500" /> Acesso e Permissões
                </h3>

                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-800">
                  {/* Toggle Login */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateField('loginEnabled', !selectedBarber.loginEnabled)}
                        className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${selectedBarber.loginEnabled ? 'bg-primary-500' : 'bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${selectedBarber.loginEnabled ? 'left-7' : 'left-1'}`}></div>
                      </button>
                      <div>
                        <p className="text-white font-medium cursor-pointer" onClick={() => updateField('loginEnabled', !selectedBarber.loginEnabled)}>Permitir Login no Sistema</p>
                        <p className="text-xs text-gray-500">O profissional poderá acessar o painel com seu e-mail e senha.</p>
                      </div>
                    </div>
                  </div>

                  {/* Presets de Permissão */}
                  {selectedBarber.loginEnabled && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Carregar Perfil Predefinido</label>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => applyPreset('barber')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg border border-gray-700 transition-colors">
                            <User size={16} /> Perfil Barbeiro
                          </button>
                          <button type="button" onClick={() => applyPreset('receptionist')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg border border-gray-700 transition-colors">
                            <CheckSquare size={16} /> Perfil Recepcionista
                          </button>
                          <button type="button" onClick={() => applyPreset('admin')} className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 hover:text-primary-400 text-sm rounded-lg border border-primary-500/30 transition-colors">
                            <Shield size={16} /> Acesso Admin
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Funcionalidades Liberadas</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {SYSTEM_PERMISSIONS.map(permission => {
                            const isChecked = selectedBarber.permissions?.includes(permission.id);
                            return (
                              <div
                                key={permission.id}
                                onClick={() => togglePermission(permission.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${isChecked ? 'bg-primary-500/10 border-primary-500/30 shadow-sm' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}`}
                              >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-primary-500 border-primary-500' : 'border-gray-500 bg-transparent'}`}>
                                  {isChecked && <Check size={14} className="text-dark-950 stroke-[4]" />}
                                </div>
                                <span className={`text-sm font-medium ${isChecked ? 'text-white' : 'text-gray-400'}`}>{permission.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="flex justify-between w-full pt-4 border-t border-gray-800">
                <div className="flex items-center">
                  {/* Botão de Excluir / Confirmação */}
                  {selectedBarber.id && selectedBarber.id.length > 20 && (
                    isDeleteConfirming ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in">
                        <span className="text-white font-bold mr-2">Tem certeza?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedBarber.id)}
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
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 font-bold rounded-lg transition-colors border border-red-500/20"
                      >
                        <Trash2 size={20} />
                        Excluir
                      </button>
                    )
                  )}
                </div>

                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBarber(null);
                      setIsDeleteConfirming(false);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  {!isDeleteConfirming && (
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors"
                    >
                      <Save size={20} />
                      Salvar Dados
                    </button>
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

export default StaffPage;
