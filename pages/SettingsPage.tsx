
import React, { useState } from 'react';
import { User, Shield, Bell, Save } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
       <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="text-gray-400">Gerencie seu perfil e segurança.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Menu Lateral */}
          <div className="md:col-span-1 space-y-2">
             <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-all ${activeTab === 'profile' ? 'bg-gray-800 text-white border-l-4 border-primary-500 shadow-md' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
             >
                <User size={18} /> Meu Perfil
             </button>
             <button 
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-all ${activeTab === 'security' ? 'bg-gray-800 text-white border-l-4 border-primary-500 shadow-md' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
             >
                <Shield size={18} /> Segurança
             </button>
             <button 
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-all ${activeTab === 'notifications' ? 'bg-gray-800 text-white border-l-4 border-primary-500 shadow-md' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
             >
                <Bell size={18} /> Notificações
             </button>
          </div>

          {/* Área de Conteúdo */}
          <div className="md:col-span-3 bg-dark-900 border border-gray-800 rounded-xl p-6 min-h-[500px]">
             
             {activeTab === 'profile' && (
                 <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-4">Editar Perfil</h2>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center text-dark-950 font-bold text-3xl shadow-lg">AD</div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Administrador</h3>
                                <p className="text-sm text-gray-500">Gerente Geral</p>
                                <button className="text-xs text-primary-500 hover:underline mt-1">Alterar foto</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nome Completo</label>
                                <input type="text" defaultValue="Administrador do Sistema" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">E-mail</label>
                                <input type="email" defaultValue="admin@barbermaster.com" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none" />
                            </div>
                        </div>
                        <div className="pt-6 border-t border-gray-800 flex justify-end">
                            <button className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors shadow-lg shadow-primary-500/10">
                                <Save size={18} /> Salvar Alterações
                            </button>
                        </div>
                    </div>
                 </div>
             )}

             {activeTab === 'security' && (
                 <div className="text-center py-10 text-gray-500 animate-in fade-in">
                     <Shield size={48} className="mx-auto mb-4 opacity-50" />
                     <p>Configurações de segurança (Senha, 2FA) estariam aqui.</p>
                 </div>
             )}

             {activeTab === 'notifications' && (
                 <div className="text-center py-10 text-gray-500 animate-in fade-in">
                     <Bell size={48} className="mx-auto mb-4 opacity-50" />
                     <p>Preferências de notificações do sistema estariam aqui.</p>
                 </div>
             )}

          </div>
       </div>
    </div>
  );
};

export default SettingsPage;
