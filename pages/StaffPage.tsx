
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
    <div className="space-y-6 relative pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Profissionais</h1>
          <p className="text-gray-500 text-sm">Gerencie sua equipe e permissões de acesso</p>
        </div>
        <button
          onClick={handleAddNew}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-dark-950 px-6 py-3 rounded-xl font-black transition-all shadow-xl shadow-primary-500/10"
        >
          <Plus size={20} />
          Adicionar Profissional
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barbers.map((barber) => (
          <div key={barber.id} className="bg-dark-900 rounded-2xl border border-gray-800 overflow-hidden group hover:border-primary-500/30 transition-all hover:shadow-2xl hover:shadow-primary-500/5">
            <div className="h-24 bg-gradient-to-br from-gray-800 to-dark-950 relative">
              <button
                onClick={() => handleEdit(barber)}
                className="absolute top-4 right-4 bg-dark-950/40 backdrop-blur-md text-gray-400 hover:text-white p-2.5 rounded-xl transition-all border border-white/5"
                title="Editar Profissional"
              >
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="px-6 pb-6">
              <div className="relative -top-12 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full border-4 border-dark-900 overflow-hidden bg-gray-800 shadow-2xl flex items-center justify-center relative group-hover:scale-105 transition-transform">
                  {barber.avatar ? (
                    <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary-500 flex items-center justify-center text-4xl font-black text-dark-950">
                      {barber.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="mt-4 text-xl font-black text-white text-center leading-tight">{barber.name}</h3>
                <div className="flex flex-col items-center mt-1">
                  <p className="text-primary-500 font-bold text-sm tracking-wide uppercase">{barber.role}</p>
                  <p className="text-gray-500 text-xs mt-1 font-medium">{barber.email || 'Sem e-mail'}</p>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${barber.active ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${barber.active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    {barber.active ? 'Ativo' : 'Inativo'}
                  </span>
                  {barber.loginEnabled && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary-500/10 text-primary-500 border border-primary-500/20 flex items-center gap-1">
                      <Lock size={10} /> Acesso
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-0 flex justify-center">
                <div className="bg-gray-800/20 p-4 rounded-2xl border border-gray-800/50 flex flex-col items-center justify-center w-full max-w-[140px]">
                  <div className="flex items-center text-white font-black text-2xl gap-0.5">
                    {barber.commissionRate}<Percent size={16} className="text-primary-500 mt-1" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Comissão</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800/50 flex justify-between items-center text-sm">
                <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/5 px-2 py-1 rounded-lg">
                  <Star size={14} fill="currentColor" />
                  <span className="font-black">4.9</span>
                </div>
                <button onClick={() => handleEdit(barber)} className="text-primary-500 hover:text-primary-400 font-black text-xs uppercase tracking-widest hover:underline transition-all">
                  Permissões
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Edição - Mobile First */}
      {selectedBarber && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-900 w-full max-w-2xl rounded-t-3xl md:rounded-2xl border-t md:border border-gray-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-800 bg-dark-900/50 sticky top-0 z-10">
              <h2 className="text-xl font-black text-white">
                {barbers.some(b => b.id === selectedBarber.id) ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button
                onClick={() => setSelectedBarber(null)}
                className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-5 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Coluna Esquerda: Foto e Info Básica */}
                <div className="md:col-span-1 space-y-6">
                  <div className="flex flex-col items-center justify-center space-y-4">
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
                        className={`w-32 h-32 rounded-full border-4 flex items-center justify-center overflow-hidden cursor-pointer transition-all relative ${selectedBarber.avatar
                          ? 'border-gray-800 hover:border-primary-500 shadow-xl'
                          : 'border-dashed border-gray-700 hover:border-primary-500 bg-gray-800/50'
                          }`}
                      >
                        {selectedBarber.avatar ? (
                          <img src={selectedBarber.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : selectedBarber.name ? (
                          <div className="w-full h-full bg-primary-500 flex items-center justify-center text-5xl font-black text-dark-950">
                            {selectedBarber.name.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-gray-600">
                            <Upload size={24} />
                            <span className="text-[10px] uppercase font-black mt-2 tracking-widest">Foto</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><ImageIcon size={14} /> Trocar</span>
                        </div>
                      </div>
                      {selectedBarber.avatar && (
                        <button type="button" onClick={removeImage} className="absolute bottom-1 right-1 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 active:scale-90 transition-all z-20 border-2 border-dark-900">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-800/20 p-4 rounded-xl border border-gray-800/50">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Status na Agenda</label>
                    <div
                      onClick={() => updateField('active', !selectedBarber.active)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedBarber.active ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/5 border-red-500/10'}`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedBarber.active ? 'bg-green-500 border-green-500' : 'border-gray-700 bg-transparent'}`}>
                        {selectedBarber.active && <Check size={14} className="text-dark-950 font-black" />}
                      </div>
                      <span className={`text-sm font-bold ${selectedBarber.active ? 'text-white' : 'text-gray-500'}`}>
                        Ativo e Visível
                      </span>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Dados Cadastrais */}
                <div className="md:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 text-gray-600" size={18} />
                        <input
                          type="text"
                          value={selectedBarber.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white font-medium focus:outline-none focus:border-primary-500 transition-colors"
                          placeholder="Ex: João Silva"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">E-mail Corporativo</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 text-gray-600" size={18} />
                        <input
                          type="email"
                          value={selectedBarber.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white font-medium focus:outline-none focus:border-primary-500 transition-colors"
                          placeholder="Ex: profissional@barbermaster.com.br"
                        />
                      </div>
                      {selectedBarber.loginEnabled && (
                        <p className="text-[10px] text-primary-500/70 mt-2 font-bold flex items-start gap-1.5 ml-1">
                          <KeyRound size={12} className="shrink-0 mt-0.5" />
                          Senhas novas começam como "1234" (alteração obrigatória no 1º acesso).
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Cargo</label>
                        <div className="relative">
                          <Briefcase className="absolute left-4 top-3.5 text-gray-600" size={18} />
                          <input
                            type="text"
                            value={selectedBarber.role}
                            onChange={(e) => updateField('role', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white font-medium focus:outline-none focus:border-primary-500 transition-colors"
                            placeholder="Ex: Barbeiro"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Comissão (%)</label>
                        <div className="relative">
                          <Percent className="absolute right-4 top-3.5 text-gray-600" size={18} />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={selectedBarber.commissionRate}
                            onChange={(e) => updateField('commissionRate', parseFloat(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-4 pr-12 py-3 text-white font-black focus:outline-none focus:border-primary-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Permissões e Login */}
              <div className="pt-8 border-t border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Segurança e Acesso</h3>
                    <p className="text-xs text-gray-500 font-medium">Controle o que este profissional pode fazer</p>
                  </div>
                </div>

                <div className="bg-gray-800/10 rounded-2xl p-5 md:p-6 border border-gray-800">
                  {/* Toggle Login */}
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800/50">
                    <div className="flex-1 mr-4">
                      <p className="text-white font-black text-sm uppercase tracking-wide">Permitir Login no Sistema</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">Libera acesso ao painel administrativo via e-mail corporativo.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField('loginEnabled', !selectedBarber.loginEnabled)}
                      className={`w-14 h-7 rounded-full relative transition-all shadow-inner focus:outline-none ${selectedBarber.loginEnabled ? 'bg-primary-500' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${selectedBarber.loginEnabled ? 'left-8' : 'left-1'}`}></div>
                    </button>
                  </div>

                  {/* Presets de Permissão */}
                  {selectedBarber.loginEnabled && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-1">Configurações Rápidas (Presets)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button type="button" onClick={() => applyPreset('barber')} className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white text-xs font-black uppercase tracking-widest rounded-xl border border-gray-700 transition-all active:scale-[0.98]">
                            <User size={14} /> Barbeiro
                          </button>
                          <button type="button" onClick={() => applyPreset('receptionist')} className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white text-xs font-black uppercase tracking-widest rounded-xl border border-gray-700 transition-all active:scale-[0.98]">
                            <CheckSquare size={14} /> Recepção
                          </button>
                          <button type="button" onClick={() => applyPreset('admin')} className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 text-xs font-black uppercase tracking-widest rounded-xl border border-primary-500/20 transition-all active:scale-[0.98]">
                            <Shield size={14} /> Admin
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-1">Nível de Acesso Customizado</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {SYSTEM_PERMISSIONS.map(permission => {
                            const isChecked = selectedBarber.permissions?.includes(permission.id);
                            return (
                              <div
                                key={permission.id}
                                onClick={() => togglePermission(permission.id)}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all select-none active:scale-[0.98] ${isChecked ? 'bg-primary-500/5 border-primary-500/30 shadow-lg shadow-primary-500/5' : 'bg-dark-900 border-gray-800 hover:border-gray-700'}`}
                              >
                                <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isChecked ? 'bg-primary-500 shadow-lg shadow-primary-500/20' : 'bg-gray-800 border-2 border-gray-700'}`}>
                                  {isChecked && <Check size={12} className="text-dark-950 stroke-[5]" />}
                                </div>
                                <span className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-gray-500'}`}>{permission.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer do Modal - Sticky and Adaptive */}
              <div className="flex flex-col-reverse sm:flex-row justify-between items-center w-full gap-4 pt-4 border-t border-gray-800">
                <div className="w-full sm:w-auto">
                  {/* Botão de Excluir / Confirmação */}
                  {selectedBarber.id && selectedBarber.id.length > 20 && (
                    isDeleteConfirming ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in w-full">
                        <span className="text-white text-sm font-black uppercase mr-2 shrink-0">Confirmar?</span>
                        <div className="flex gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => handleDelete(selectedBarber.id)}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg active:scale-95"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsDeleteConfirming(false)}
                            className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                          >
                            Não
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeleteConfirming(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-xs uppercase tracking-widest rounded-xl transition-all border border-red-500/20 active:scale-95"
                      >
                        <Trash2 size={16} />
                        Excluir Profissional
                      </button>
                    )
                  )}
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBarber(null);
                      setIsDeleteConfirming(false);
                    }}
                    className="flex-1 sm:flex-none px-6 py-3 text-gray-500 hover:text-white font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Sair
                  </button>
                  {!isDeleteConfirming && (
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-dark-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-primary-500/10"
                    >
                      <Save size={18} />
                      Salvar Alterações
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
