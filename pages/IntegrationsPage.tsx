
import React, { useState, useEffect } from 'react';
import { MessageCircle, QrCode, Smartphone, CheckCircle2, RefreshCw, AlertTriangle, Settings, ArrowRight, X, Play, Scissors, Save, Wallet, Building2, User } from 'lucide-react';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

const IntegrationsPage: React.FC = () => {
    const { currentUser } = useAuth();

    // --- Payment Gateway (Asaas) ---
    const [payoutMode, setPayoutMode] = useState<'CNPJ' | 'CPF' | null>(null);
    const [connectedWallet, setConnectedWallet] = useState<{ walletId: string; personType: string } | null>(null);
    const [connectingPayout, setConnectingPayout] = useState(false);
    const [cnpjForm, setCnpjForm] = useState({
        name: '', cpfCnpj: '', email: '', birthDate: '', companyType: 'MEI', incomeValue: '',
        phone: '', mobilePhone: '', address: '', addressNumber: '', complement: '', province: '', postalCode: ''
    });
    const [cpfApiKey, setCpfApiKey] = useState('');

    useEffect(() => {
        loadPaymentGateway();
    }, [currentUser?.tenantId]);

    const loadPaymentGateway = async () => {
        if (!currentUser?.tenantId) return;
        const { data } = await supabase
            .from('tenants')
            .select('asaas_wallet_id, asaas_person_type')
            .eq('id', currentUser.tenantId)
            .single();
        if (data?.asaas_wallet_id) {
            setConnectedWallet({ walletId: data.asaas_wallet_id, personType: data.asaas_person_type });
        }
    };

    const handleConnectCnpj = async () => {
        try {
            setConnectingPayout(true);
            const { data, error } = await supabase.functions.invoke('asaas-create-subaccount', {
                body: { tenantId: currentUser?.tenantId, ...cnpjForm, incomeValue: Number(cnpjForm.incomeValue) || undefined }
            });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Erro ao conectar');
            await loadPaymentGateway();
            alert('Conta conectada com sucesso!');
        } catch (err: any) {
            alert(`Erro: ${err.message}`);
        } finally {
            setConnectingPayout(false);
        }
    };

    const handleConnectCpf = async () => {
        try {
            setConnectingPayout(true);
            const { data, error } = await supabase.functions.invoke('asaas-connect-wallet', {
                body: { tenantId: currentUser?.tenantId, apiKey: cpfApiKey }
            });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Erro ao conectar');
            setCpfApiKey('');
            await loadPaymentGateway();
            alert('Carteira conectada com sucesso!');
        } catch (err: any) {
            alert(`Erro: ${err.message}`);
        } finally {
            setConnectingPayout(false);
        }
    };
    // States for WhatsApp Integration
    const [waStatus, setWaStatus] = useState<'disconnected' | 'qr' | 'connecting' | 'connected'>('disconnected');
    const [waConfig, setWaConfig] = useState<any>({
        reminder: true,
        confirmation: true,
        birthday: false,
        marketing: false,
        interactiveButtons: true, // Novo: Botões interativos
        templates: {
            confirmation: "",
            reminder: "",
            birthday: "",
            marketing: ""
        }
    });

    // Unified Config Modal State
    const [configModal, setConfigModal] = useState<{
        isOpen: boolean;
        type: 'confirmation' | 'reminder' | 'birthday' | 'marketing';
    }>({ isOpen: false, type: 'confirmation' });

    const marketingPresets = [
        { name: 'Natal 🎅', text: "HoHoHo! 🎅 Feliz Natal *{cliente}*! Aproveite nosso presente especial de fim de ano na *{barbearia}*. Agende seu corte para o Natal! 🎄" },
        { name: 'Black Friday 🔥', text: "🔥 Black Friday na *{barbearia}*! Descontos insanos essa semana. Corra e garanta seu horário antes que acabe! 🏃‍♂️" },
        { name: 'Ano Novo ✨', text: "✨ Feliz 2026! Comece o ano no estilo. Estamos com horários abertos para o Reveillon na *{barbearia}*. 🥂" },
        { name: 'Aniversário da Barbearia 🎂', text: "🎂 É nosso aniversário, mas quem ganha é você! Venha comemorar com a gente na *{barbearia}*. 🍻" }
    ];

    // Estado para simulação dentro do modal
    const [simStep, setSimStep] = useState(0);

    // Load Settings on Mount
    useEffect(() => {
        if (currentUser?.tenantId) {
            loadSettings();
        }
    }, [currentUser]);

    const loadSettings = async () => {
        const { data } = await supabase.from('tenants').select('settings').eq('id', currentUser?.tenantId).single();
        if (data?.settings?.wa_templates) {
            setWaConfig((prev: any) => ({ ...prev, templates: data.settings.wa_templates }));
        } else if (data?.settings?.wa_template) {
            // Migration for legacy single template
            setWaConfig((prev: any) => ({ ...prev, templates: { ...prev.templates, confirmation: data.settings.wa_template } }));
        }
    };

    const saveConfig = async () => {
        // Ensure templates object exists
        const currentTemplates = waConfig.templates || {};

        const { error } = await supabase.from('tenants').update({
            settings: { wa_templates: currentTemplates }
        }).eq('id', currentUser?.tenantId);

        if (error) alert('Erro ao salvar.');
        else alert('Modelo salvo com sucesso!');
    };

    const getActiveTemplate = () => {
        return waConfig.templates?.[configModal.type] || getDefaultTemplate(configModal.type);
    }

    const getDefaultTemplate = (type: string) => {
        switch (type) {
            case 'confirmation': return "Olá *{cliente}*! ✂️\n\nSeu agendamento na *{barbearia}* está marcado para *{data}* às *{horario}* com *{profissional}*.\nServiço: {servico}\n\nConfirme sua presença abaixo: 👇\n{link_confirmar}\n\nOu cancele se necessário:\n{link_cancelar}";
            case 'reminder': return "Lembrete ⏰: Oi *{cliente}*, seu horário na *{barbearia}* é amanhã às *{horario}*. Estamos te esperando!";
            case 'birthday': return "Parabéns *{cliente}*! 🎉 Feliz aniversário! Venha dar um tapa no visual com a gente. 🎁";
            case 'marketing': return "Fala *{cliente}*! Novidades na *{barbearia}*...";
            default: return "";
        }
    }

    const handleTemplateChange = (text: string) => {
        setWaConfig((prev: any) => ({
            ...prev,
            templates: {
                ...prev.templates,
                [configModal.type]: text
            }
        }));
    }

    const handleConnectWA = () => {
        setWaStatus('qr');
        // Simulate scanning delay
        setTimeout(() => {
            setWaStatus('connecting');
            setTimeout(() => {
                setWaStatus('connected');
            }, 2000);
        }, 4000);
    };

    const handleDisconnectWA = () => {
        if (window.confirm("Tem certeza que deseja desconectar? As mensagens automáticas pararão de ser enviadas.")) {
            setWaStatus('disconnected');
        }
    }

    const runSimulation = () => {
        setSimStep(1); // Envia msg
        setTimeout(() => setSimStep(2), 1500); // Cliente recebe
    };

    const handleSimResponse = (response: 'yes' | 'no') => {
        if (response === 'yes') {
            setSimStep(3); // Confirmado
        } else {
            setSimStep(4); // Cancelado -> Fila
        }
    };

    const resetSimulation = () => {
        setSimStep(0);
    };

    const openModal = (type: 'confirmation' | 'reminder' | 'birthday' | 'marketing') => {
        setConfigModal({ isOpen: true, type });
        setSimStep(0);
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Integrações</h1>
                    <p className="text-gray-400">Conecte canais de comunicação para automatizar sua barbearia.</p>
                </div>
            </div>

            {/* Payment Gateway (Asaas) Integration Card */}
            <div className={`border rounded-xl p-6 transition-all ${connectedWallet ? 'bg-green-500/5 border-green-500/30' : 'bg-dark-900 border-gray-800'}`}>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${connectedWallet ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                            <Wallet size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Recebimento de Pagamentos</h3>
                            <p className="text-sm text-gray-400">Receba as assinaturas dos seus clientes automaticamente</p>
                        </div>
                    </div>
                    {connectedWallet ? (
                        <span className="flex items-center gap-1.5 bg-green-500 text-dark-950 px-3 py-1 rounded-full text-xs font-bold uppercase">
                            <CheckCircle2 size={14} /> Conectado
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 bg-gray-700 text-gray-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                            Desconectado
                        </span>
                    )}
                </div>

                {connectedWallet ? (
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 flex items-center justify-between">
                        <div>
                            <p className="text-white font-medium text-sm">Carteira Asaas conectada</p>
                            <p className="text-xs text-green-500 font-mono">{connectedWallet.personType === 'CNPJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} • {connectedWallet.walletId}</p>
                        </div>
                    </div>
                ) : !payoutMode ? (
                    <div className="bg-gray-800/30 rounded-lg p-8 text-center border border-gray-800 border-dashed">
                        <div className="max-w-md mx-auto space-y-4">
                            <Wallet size={40} className="mx-auto text-gray-600" />
                            <h4 className="text-white font-bold">Você tem CNPJ?</h4>
                            <p className="text-gray-400 text-sm">Isso define como você vai receber automaticamente o dinheiro dos seus clientes.</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setPayoutMode('CNPJ')} className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-5 py-2.5 rounded-lg font-bold transition-colors">
                                    <Building2 size={16} /> Sim, tenho CNPJ
                                </button>
                                <button onClick={() => setPayoutMode('CPF')} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors">
                                    <User size={16} /> Não, só CPF
                                </button>
                            </div>
                        </div>
                    </div>
                ) : payoutMode === 'CNPJ' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input placeholder="Nome da barbearia" value={cnpjForm.name} onChange={e => setCnpjForm({ ...cnpjForm, name: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
                            <input placeholder="CNPJ (só números)" value={cnpjForm.cpfCnpj} onChange={e => setCnpjForm({ ...cnpjForm, cpfCnpj: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
                            <input placeholder="E-mail" value={cnpjForm.email} onChange={e => setCnpjForm({ ...cnpjForm, email: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
                            <input placeholder="Celular (DDD + número)" value={cnpjForm.mobilePhone} onChange={e => setCnpjForm({ ...cnpjForm, mobilePhone: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
                            <input placeholder="CEP" value={cnpjForm.postalCode} onChange={e => setCnpjForm({ ...cnpjForm, postalCode: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
                            <input placeholder="Endereço" value={cnpjForm.address} onChange={e => setCnpjForm({ ...cnpjForm, address: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
                            <input placeholder="Número" value={cnpjForm.addressNumber} onChange={e => setCnpjForm({ ...cnpjForm, addressNumber: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
                            <input placeholder="Bairro" value={cnpjForm.province} onChange={e => setCnpjForm({ ...cnpjForm, province: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setPayoutMode(null)} className="text-gray-400 hover:text-white text-sm font-bold px-4">Voltar</button>
                            <button onClick={handleConnectCnpj} disabled={connectingPayout} className="flex-1 bg-primary-500 hover:bg-primary-600 text-dark-950 py-3 rounded-lg font-bold disabled:opacity-50">
                                {connectingPayout ? 'Conectando...' : 'Conectar Conta'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-primary-500/5 p-4 rounded-lg border border-primary-500/10 text-sm text-gray-300">
                            1. Crie sua conta grátis em <a href="https://www.asaas.com" target="_blank" rel="noreferrer" className="text-primary-500 underline">asaas.com</a><br />
                            2. No painel dela, vá em "Integrações" e gere uma Chave de API<br />
                            3. Cole a chave abaixo
                        </div>
                        <textarea placeholder="Cole aqui sua chave de API da Asaas" value={cpfApiKey} onChange={e => setCpfApiKey(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm h-20" />
                        <div className="flex gap-3">
                            <button onClick={() => setPayoutMode(null)} className="text-gray-400 hover:text-white text-sm font-bold px-4">Voltar</button>
                            <button onClick={handleConnectCpf} disabled={connectingPayout || !cpfApiKey} className="flex-1 bg-primary-500 hover:bg-primary-600 text-dark-950 py-3 rounded-lg font-bold disabled:opacity-50">
                                {connectingPayout ? 'Conectando...' : 'Conectar Carteira'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* WhatsApp Integration Card */}
            <div className={`border rounded-xl p-6 transition-all ${waStatus === 'connected' ? 'bg-green-500/5 border-green-500/30' : 'bg-dark-900 border-gray-800'}`}>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${waStatus === 'connected' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                            <MessageCircle size={32} fill={waStatus === 'connected' ? "currentColor" : "none"} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">WhatsApp Business</h3>
                            <p className="text-sm text-gray-400">Automação de lembretes e marketing</p>
                        </div>
                    </div>
                    <div>
                        {waStatus === 'connected' ? (
                            <span className="flex items-center gap-1.5 bg-green-500 text-dark-950 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                <CheckCircle2 size={14} /> Conectado
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 bg-gray-700 text-gray-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                Desconectado
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Content */}
                {waStatus === 'disconnected' && (
                    <div className="bg-gray-800/30 rounded-lg p-8 text-center border border-gray-800 border-dashed">
                        <div className="max-w-md mx-auto">
                            <QrCode size={48} className="mx-auto text-gray-600 mb-4" />
                            <h4 className="text-white font-bold mb-2">Conecte seu WhatsApp</h4>
                            <p className="text-gray-400 text-sm mb-6">
                                Escaneie o QR Code para vincular o WhatsApp da barbearia. Isso permitirá o envio automático de confirmações de agendamento e lembretes para reduzir o no-show.
                            </p>
                            <button
                                onClick={handleConnectWA}
                                className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center gap-2 mx-auto shadow-lg shadow-green-900/20"
                            >
                                <Smartphone size={18} /> Gerar QR Code de Conexão
                            </button>
                        </div>
                    </div>
                )}

                {(waStatus === 'qr' || waStatus === 'connecting') && (
                    <div className="bg-white p-6 rounded-lg text-center max-w-xs mx-auto shadow-2xl relative overflow-hidden">
                        {waStatus === 'connecting' && (
                            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10">
                                <RefreshCw size={32} className="text-green-600 animate-spin mb-2" />
                                <p className="text-gray-800 font-bold">Conectando...</p>
                            </div>
                        )}
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BarberMaster-Demo-Connect" alt="QR Code" className="mx-auto mb-4" />
                        <p className="text-xs text-gray-500 mb-2">1. Abra o WhatsApp no seu celular</p>
                        <p className="text-xs text-gray-500 mb-2">2. Toque em Menu ou Configurações</p>
                        <p className="text-xs text-gray-500">3. Selecione Aparelhos Conectados e escaneie</p>
                    </div>
                )}

                {waStatus === 'connected' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                                    <Smartphone size={20} className="text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-sm">Dispositivo Conectado</p>
                                    <p className="text-xs text-green-500 font-mono">Sessão Ativa • (11) 99999-8888</p>
                                </div>
                            </div>
                            <button onClick={handleDisconnectWA} className="text-red-400 hover:text-red-300 text-xs font-bold hover:underline">
                                Desconectar
                            </button>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Automações Ativas</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Confirmação Inteligente */}
                                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors relative group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="text-sm text-white font-bold flex items-center gap-2">
                                                Confirmação Interativa
                                                <span className="text-[9px] bg-green-500 text-dark-950 px-1.5 rounded font-bold uppercase">Novo</span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">Botões de "Confirmar" e "Cancelar".</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => openModal('confirmation')}
                                                className="text-primary-500 hover:text-primary-400 p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                                                title="Configurar Mensagem"
                                            >
                                                <Settings size={18} />
                                            </button>
                                            <input type="checkbox" checked={waConfig.confirmation} onChange={(e) => setWaConfig({ ...waConfig, confirmation: e.target.checked })} className="w-5 h-5 rounded border-gray-600 text-primary-500 focus:ring-primary-500 bg-gray-700 cursor-pointer" />
                                        </div>
                                    </div>
                                    {waConfig.confirmation && (
                                        <div className="text-[10px] text-gray-400 bg-gray-900/50 p-2 rounded border border-gray-700 flex items-start gap-2">
                                            <div className="min-w-[4px] h-4 bg-primary-500 rounded-full mt-0.5"></div>
                                            <p>Se o cliente clicar em <strong>"Cancelar"</strong>, o horário ficará vago automaticamente e notificará a <strong>Fila de Espera</strong>.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Lembrete */}
                                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                                    <div>
                                        <p className="text-sm text-white font-bold">Lembrete Automático (24h)</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Envia alerta 24h antes do horário marcado.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => openModal('reminder')} className="text-primary-500 hover:text-primary-400 p-1.5 rounded-lg hover:bg-gray-700 transition-colors"><Settings size={18} /></button>
                                        <input type="checkbox" checked={waConfig.reminder} onChange={(e) => setWaConfig({ ...waConfig, reminder: e.target.checked })} className="w-5 h-5 rounded border-gray-600 text-primary-500 focus:ring-primary-500 bg-gray-700 cursor-pointer" />
                                    </div>
                                </div>

                                {/* Aniversário */}
                                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                                    <div>
                                        <p className="text-sm text-white font-bold">Feliz Aniversário</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Envia felicitações e cupom no dia do aniversário.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => openModal('birthday')} className="text-primary-500 hover:text-primary-400 p-1.5 rounded-lg hover:bg-gray-700 transition-colors"><Settings size={18} /></button>
                                        <input type="checkbox" checked={waConfig.birthday} onChange={(e) => setWaConfig({ ...waConfig, birthday: e.target.checked })} className="w-5 h-5 rounded border-gray-600 text-primary-500 focus:ring-primary-500 bg-gray-700 cursor-pointer" />
                                    </div>
                                </div>

                                {/* Marketing */}
                                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                                    <div>
                                        <p className="text-sm text-white font-bold">Campanhas de Marketing</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Permite envio de promoções em massa.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => openModal('marketing')} className="text-primary-500 hover:text-primary-400 p-1.5 rounded-lg hover:bg-gray-700 transition-colors"><Settings size={18} /></button>
                                        <input type="checkbox" checked={waConfig.marketing} onChange={(e) => setWaConfig({ ...waConfig, marketing: e.target.checked })} className="w-5 h-5 rounded border-gray-600 text-primary-500 focus:ring-primary-500 bg-gray-700 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Unified */}
            {configModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[90vh]">

                        {/* Lado Esquerdo: Configuração */}
                        <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-800 overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <MessageCircle size={24} className="text-green-500" />
                                    {configModal.type === 'confirmation' && 'Confirmação'}
                                    {configModal.type === 'reminder' && 'Lembrete'}
                                    {configModal.type === 'birthday' && 'Aniversário'}
                                    {configModal.type === 'marketing' && 'Marketing'}
                                </h3>
                                <button onClick={() => { setConfigModal({ ...configModal, isOpen: false }); resetSimulation(); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Mensagem Personalizada</label>

                                    {/* Marketing Presets Dropdown */}
                                    {configModal.type === 'marketing' && (
                                        <div className="mb-4">
                                            <p className="text-xs text-gray-400 mb-2">Modelos Prontos:</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {marketingPresets.map(preset => (
                                                    <button
                                                        key={preset.name}
                                                        onClick={() => handleTemplateChange(preset.text)}
                                                        className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-left p-2 rounded transition-colors"
                                                    >
                                                        {preset.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <textarea
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors h-48 resize-none"
                                        placeholder="Digite sua mensagem aqui..."
                                        value={getActiveTemplate()}
                                        onChange={(e) => handleTemplateChange(e.target.value)}
                                    />
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {['{cliente}', '{barbearia}', '{data}', '{horario}', '{profissional}', '{servico}', '{link_confirmar}', '{link_cancelar}'].map(tag => (
                                            <span
                                                key={tag}
                                                onClick={() => handleTemplateChange((getActiveTemplate() || "") + tag)}
                                                className="text-[10px] bg-gray-700 text-gray-300 px-2 py-1 rounded cursor-pointer hover:bg-gray-600 border border-gray-600"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2">
                                    Clique nas tags acima para inserir variáveis dinâmicas.
                                </p>
                            </div>

                            <button
                                onClick={saveConfig}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                            >
                                <Save size={18} /> Salvar Modelo
                            </button>

                            <div className="space-y-3 pt-4 border-t border-gray-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-300">Sincronizar com App</span>
                                    <div className="w-10 h-5 bg-green-600 rounded-full relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow"></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-300">Liberar vaga ao Cancelar</span>
                                    <div className="w-10 h-5 bg-green-600 rounded-full relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow"></div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Lado Direito: Preview e Simulação */}
                    <div className="p-6 md:w-1/2 bg-gray-950 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>

                        {/* Simulação Celular */}
                        <div className="w-[280px] bg-white rounded-[2rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative z-10 flex flex-col h-[500px]">
                            {/* Header WhatsApp */}
                            <div className="bg-[#075E54] p-3 flex items-center gap-2 text-white">
                                <ArrowRight className="rotate-180" size={16} />
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Scissors size={16} /></div>
                                <div>
                                    <p className="text-xs font-bold">BarberMaster</p>
                                    <p className="text-[8px] opacity-80">Conta Comercial</p>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 bg-[#ECE5DD] p-3 flex flex-col gap-3 overflow-y-auto text-xs font-sans">

                                {/* Passo 0: Botão de Start */}
                                {simStep === 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                                        <p className="mb-2 font-bold text-gray-600">Teste o Fluxo</p>
                                        <button onClick={runSimulation} className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-1 shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
                                            <Play size={12} fill="currentColor" /> Simular Envio
                                        </button>
                                    </div>
                                )}

                                {/* Mensagem da Barbearia */}
                                {simStep >= 1 && (
                                    <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm self-start max-w-[85%] animate-in slide-in-from-left-2 whitespace-pre-wrap">
                                        <p className="text-gray-800">
                                            {(getActiveTemplate() || "")
                                                .replace('{cliente}', 'João')
                                                .replace('{barbearia}', 'BarberMaster')
                                                .replace('{data}', '30/12/2024')
                                                .replace('{horario}', '15:00')
                                                .replace('{profissional}', 'Gui Pimenta')
                                                .replace('{servico}', 'Corte de Cabelo')
                                                .replace('{link_confirmar}', 'https://app.../confirm')
                                                .replace('{link_cancelar}', 'https://app.../cancel')
                                            }
                                        </p>
                                        <p className="text-[9px] text-gray-400 text-right mt-1">10:30</p>
                                    </div>
                                )}

                                {/* Simulação de Links clicáveis (Visual apenas) */}
                                {simStep >= 1 && configModal.type === 'confirmation' && (
                                    <div className="self-start max-w-[85%] flex flex-col gap-2 w-full animate-in fade-in duration-500 pl-1">
                                        <span className="text-[10px] text-blue-500 underline cursor-pointer">app.barber/confirm</span>
                                        <span className="text-[10px] text-blue-500 underline cursor-pointer">app.barber/cancel</span>
                                    </div>
                                )}

                                {simStep >= 1 && (
                                    <div className="mt-4 text-center">
                                        <button onClick={resetSimulation} className="text-[10px] text-blue-600 underline cursor-pointer">Reiniciar Teste</button>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntegrationsPage;
