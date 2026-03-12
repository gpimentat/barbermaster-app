import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Scissors, Save, AlertCircle, Plus } from 'lucide-react';
import { supabase } from '../src/supabaseClient'; // Corrected path
import { useAuth } from '../AuthContext';
import { Client, Barber, Service } from '../types';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { currentUser, barbers } = useAuth(); // Barbers avail from context
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState<Service[]>([]);

    // Selection States
    // Fix Timezone: Initial date should be local YYYY-MM-DD
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localToday = new Date(today.getTime() - offset).toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(localToday);
    const [selectedTime, setSelectedTime] = useState('09:00');
    const [selectedBarberId, setSelectedBarberId] = useState(currentUser?.id || '');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [additionalServices, setAdditionalServices] = useState<{ service_id: string; name: string; price: number; duration: number }[]>([]);
    const [durationOverride, setDurationOverride] = useState<number>(0);
    const [showDurationPrompt, setShowDurationPrompt] = useState(false);
    const [pendingExtraService, setPendingExtraService] = useState<any>(null);

    // Client States
    const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
    const [clients, setClients] = useState<Client[]>([]);
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');

    // New Client Form
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchServices();
            // Initial fetch or reset
            setClientSearch('');
            fetchClients('');
        }
    }, [isOpen]);

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) fetchClients(clientSearch);
        }, 500);
        return () => clearTimeout(timer);
    }, [clientSearch, isOpen]);

    const fetchServices = async () => {
        const { data } = await supabase.from('services').select('*'); // Removed .eq('active', true) as column is missing
        if (data) setServices(data.map((s: any) => ({
            id: s.id,
            name: s.name,
            price: s.price,
            durationMinutes: s.duration_minutes,
            description: s.description || '',
            chips: s.chips || 0
        })));
    };

    const fetchClients = async (search = '') => {
        try {
            let query = supabase
                .from('clients')
                .select('id, name, phone')
                .order('name')
                .limit(20);

            if (search) {
                query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
            }

            const { data } = await query;
            if (data) setClients(data as unknown as Client[]);
        } catch (err) {
            console.error(err);
        }
    };

    // Removed local filtering, now using server-side 'clients' state directly
    const displayClients = clients;

    const checkAvailability = async (barberId: string, date: string, time: string, duration: number) => {
        // Calculate End Time
        const [hours, minutes] = time.split(':').map(Number);
        const startTotal = hours * 60 + minutes;
        const endTotal = startTotal + duration;

        // Fetch appointments for that day/barber
        const { data: appts } = await supabase
            .from('appointments')
            .select('start_time, end_time')
            .eq('barber_id', barberId)
            .eq('date', date)
            .neq('status', 'Cancelado');

        if (!appts) return true;

        // Check overlap
        for (const appt of appts) {
            const [appStartH, appStartM] = appt.start_time.split(':').map(Number);
            const [appEndH, appEndM] = appt.end_time.split(':').map(Number);

            const appStartTotal = appStartH * 60 + appStartM;
            const appEndTotal = appEndH * 60 + appEndM;

            // Overlap Condition: (StartA < EndB) and (EndA > StartB)
            if (startTotal < appEndTotal && endTotal > appStartTotal) {
                return false; // Conflict
            }
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Resolve Client
            let finalClientId = selectedClientId;
            let finalClientName = '';
            let finalClientPhone = '';

            if (clientMode === 'new') {
                const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert([{
                        name: newClientName,
                        phone: newClientPhone,
                        tenant_id: currentUser?.tenantId
                    }])
                    .select()
                    .single();

                if (clientError) throw clientError;
                finalClientId = newClient.id;
                finalClientName = newClientName;
                finalClientPhone = newClientPhone;
            } else {
                const client = clients.find(c => c.id === selectedClientId);
                if (!client) throw new Error("Selecione um cliente.");
                finalClientName = client.name;
                finalClientPhone = client.phone;
            }

            // 2. Get Service Duration
            const service = services.find(s => s.id === selectedServiceId);
            if (!service) throw new Error("Selecione um serviço.");

            const totalAdditionalPrice = additionalServices.reduce((sum, s) => sum + s.price, 0);
            const totalDuration = service.durationMinutes + durationOverride;

            // 3. Calc End Time
            const [h, m] = selectedTime.split(':').map(Number);
            const dateObj = new Date();
            // Using totalDuration instead of just service.durationMinutes
            dateObj.setHours(h, m + totalDuration);
            const endTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // 4. Validate Conflict
            const isAvailable = await checkAvailability(selectedBarberId, selectedDate, selectedTime, totalDuration);
            if (!isAvailable) {
                alert('❌ Horário indisponível! Já existe um agendamento neste intervalo.');
                setLoading(false);
                return;
            }

            // 5. Create Appointment
            const { data, error: apptError } = await supabase.from('appointments').insert([{
                client_id: finalClientId,
                barber_id: selectedBarberId,
                service_id: selectedServiceId,
                date: selectedDate,
                start_time: selectedTime,
                end_time: endTime,
                price: service.price + totalAdditionalPrice,
                status: 'Agendado',
                tenant_id: currentUser?.tenantId,
                additional_services: additionalServices,
                duration_override: durationOverride
            }]).select();

            if (apptError) throw apptError;

            // 6. WhatsApp Notification
            // Use window.location.origin to get current domain (localhost or production)
            const baseUrl = window.location.origin + '/#';
            // Note: supabase insert returns array in data if .select() is used
            const newApptId = data && data[0] ? data[0].id : 'error';
            const confirmLink = `${baseUrl}/appt/${newApptId}/confirm`;
            const cancelLink = `${baseUrl}/appt/${newApptId}/cancel`;

            // Default Template
            let msgTemplate = "Olá *{cliente}*! Seu agendamento foi confirmado. ✅\n\n🗓️ {data}\n⏰ {horario}\n✂️ {servico}\n💈 Profissional: {profissional}\n🏠 {barbearia}\n\nPara confirmar, clique aqui:\n{link_confirmar}\n\nPara cancelar:\n{link_cancelar}";

            // Check if tenant has custom template
            // We need to fetch tenant settings. For optimization, we could have it in Context, but let's fetch here for now.
            const { data: tenantData } = await supabase.from('tenants').select('settings, name').eq('id', currentUser?.tenantId).single();
            if (tenantData?.settings?.wa_template) {
                msgTemplate = tenantData.settings.wa_template;
            }

            const barberName = barbers.find(b => b.id === selectedBarberId)?.name || 'Barbearia';
            const tenantName = tenantData?.name || 'Barbearia';

            const confirmMsg = msgTemplate
                .replace('{cliente}', finalClientName)
                .replace('{barbearia}', tenantName)
                .replace('{data}', new Date(selectedDate).toLocaleDateString('pt-BR'))
                .replace('{horario}', selectedTime)
                .replace('{profissional}', barberName)
                .replace('{servico}', service.name)
                .replace('{link_confirmar}', confirmLink)
                .replace('{link_cancelar}', cancelLink);

            const cleanPhone = finalClientPhone.replace(/\D/g, '');
            if (cleanPhone.length >= 10) {
                const link = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(confirmMsg)}`;
                window.open(link, '_blank');
            }

            // 7. Instant Push Notification for Barber
            try {
                // Determine if barber has notifications enabled
                const { data: barberNotif } = await supabase
                    .from('notification_settings')
                    .select('enabled')
                    .eq('user_id', selectedBarberId)
                    .eq('type', 'new_appointment')
                    .maybeSingle();

                if (barberNotif?.enabled !== false) { // Default to true if not set
                    await supabase.functions.invoke('send-push', {
                        body: {
                            user_id: selectedBarberId,
                            title: 'Novo Horário Agendado! ✂️',
                            message: `${service.name} com ${finalClientName} em ${new Date(selectedDate).toLocaleDateString('pt-BR')} às ${selectedTime}`,
                            url: '/schedule'
                        }
                    });
                }
            } catch (pushErr) {
                console.error('Error sending push to barber:', pushErr);
            }

            alert('Agendamento criado com sucesso!');
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error(error);
            alert('Erro ao criar agendamento: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-dark-900 w-full max-w-lg rounded-t-2xl md:rounded-2xl border-t md:border border-gray-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
                <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-800 bg-dark-900/50">
                    <h2 className="text-xl font-bold text-white">Novo Agendamento</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-5 overflow-y-auto custom-scrollbar">

                    {/* Client Selection */}
                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-800">
                        <div className="flex gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => setClientMode('existing')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${clientMode === 'existing' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'bg-gray-800 text-gray-400'}`}
                            >
                                Cliente Existente
                            </button>
                            <button
                                type="button"
                                onClick={() => setClientMode('new')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${clientMode === 'new' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'bg-gray-800 text-gray-400'}`}
                            >
                                Novo Cliente
                            </button>
                        </div>

                        {clientMode === 'existing' ? (
                            <div className="space-y-3">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou celular..."
                                        className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-primary-500 outline-none transition-colors"
                                        value={clientSearch}
                                        onChange={e => setClientSearch(e.target.value)}
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {displayClients.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => setSelectedClientId(c.id)}
                                            className={`p-3 rounded-lg cursor-pointer text-sm flex justify-between items-center transition-all ${selectedClientId === c.id ? 'bg-primary-500/20 border border-primary-500/50 text-white' : 'bg-dark-900/50 border border-gray-800 text-gray-400 hover:border-gray-700'}`}
                                        >
                                            <span className="font-medium truncate">{c.name}</span>
                                            <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 font-mono">{c.phone}</span>
                                        </div>
                                    ))}
                                    {displayClients.length === 0 && (
                                        <div className="text-center py-4 text-xs text-gray-600 italic">
                                            {clientSearch ? 'Nenhum cliente encontrado.' : 'Comece a digitar para buscar...'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Nome do Cliente</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: João Silva"
                                        value={newClientName}
                                        onChange={e => setNewClientName(e.target.value)}
                                        className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-primary-500 outline-none transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">WhatsApp</label>
                                    <input
                                        type="tel"
                                        placeholder="(11) 99999-9999"
                                        value={newClientPhone}
                                        onChange={e => setNewClientPhone(e.target.value)}
                                        className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-primary-500 outline-none transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Data</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <input
                                    type="date"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-primary-500 transition-colors"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Horário</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <input
                                    type="time"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-primary-500 transition-colors"
                                    value={selectedTime}
                                    onChange={e => setSelectedTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Serviço</label>
                            <div className="relative">
                                <Scissors className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <select
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-primary-500 transition-colors appearance-none"
                                    value={selectedServiceId}
                                    onChange={e => setSelectedServiceId(e.target.value)}
                                    required
                                >
                                </select>
                            </div>
                        </div>

                        {/* Additional Services List */}
                        {additionalServices.length > 0 && (
                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Serviços Adicionais</label>
                                {additionalServices.map((s, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-primary-500/5 border border-primary-500/20 p-3 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Scissors size={14} className="text-primary-500" />
                                            <span className="text-sm font-bold text-white">{s.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-gray-400">R$ {s.price}</span>
                                            <button
                                                type="button"
                                                onClick={() => setAdditionalServices(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-red-500 hover:text-red-400 p-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Extra Service Button */}
                        <div className="md:col-span-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const select = document.getElementById('extra-service-select') as HTMLSelectElement;
                                    const serviceId = select.value;
                                    if (!serviceId) return;
                                    const service = services.find(s => s.id === serviceId);
                                    if (service) {
                                        setPendingExtraService(service);
                                        setShowDurationPrompt(true);
                                    }
                                    select.value = '';
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-700 rounded-xl text-gray-500 hover:text-primary-500 hover:border-primary-500 transition-all text-xs font-bold"
                            >
                                <Plus size={14} /> Adicionar Serviço Extra
                                <select
                                    id="extra-service-select"
                                    className="bg-transparent border-none outline-none text-transparent w-4 h-4 absolute opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        const service = services.find(s => s.id === e.target.value);
                                        if (service) {
                                            setPendingExtraService(service);
                                            setShowDurationPrompt(true);
                                        }
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">+</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} (R$ {s.price})</option>
                                    ))}
                                </select>
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Profissional</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <select
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-primary-500 transition-colors appearance-none"
                                    value={selectedBarberId}
                                    onChange={e => setSelectedBarberId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {barbers.filter(b => b.active).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-800">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-dark-950 font-black py-4 rounded-xl transition-all shadow-xl shadow-primary-500/10 disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                                    Processando...
                                </span>
                            ) : (
                                <>
                                    <Save size={20} /> Confirmar Agendamento
                                </>
                            )}
                        </button>
                        <div className="text-center text-[10px] text-gray-500 mt-4 flex items-center justify-center gap-2 bg-gray-800/20 py-2 rounded-lg border border-gray-800/50">
                            <AlertCircle size={12} className="text-primary-500/50" />
                            O cliente receberá o link de confirmação no WhatsApp
                        </div>
                    </div>
                </form>

                {/* Duration Prompt Modal */}
                {showDurationPrompt && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-dark-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold text-white mb-2">Aumentar o tempo?</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Você adicionou <strong>{pendingExtraService?.name}</strong>. Deseja aumentar o tempo do agendamento?
                            </p>

                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setAdditionalServices(prev => [...prev, {
                                                service_id: pendingExtraService.id,
                                                name: pendingExtraService.name,
                                                price: pendingExtraService.price,
                                                duration: pendingExtraService.durationMinutes
                                            }]);
                                            setShowDurationPrompt(false);
                                            setPendingExtraService(null);
                                        }}
                                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold text-sm"
                                    >
                                        Não, manter tempo
                                    </button>
                                    <button
                                        onClick={() => {
                                            const mins = prompt('Quantos minutos extras?', pendingExtraService.durationMinutes.toString());
                                            if (mins !== null) {
                                                const extraMins = parseInt(mins) || 0;
                                                setDurationOverride(prev => prev + extraMins);
                                                setAdditionalServices(prev => [...prev, {
                                                    service_id: pendingExtraService.id,
                                                    name: pendingExtraService.name,
                                                    price: pendingExtraService.price,
                                                    duration: extraMins
                                                }]);
                                                setShowDurationPrompt(false);
                                                setPendingExtraService(null);
                                            }
                                        }}
                                        className="flex-1 bg-primary-500 hover:bg-primary-600 text-dark-950 py-3 rounded-xl font-bold text-sm"
                                    >
                                        Sim, aumentar
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowDurationPrompt(false);
                                        setPendingExtraService(null);
                                    }}
                                    className="w-full text-gray-500 hover:text-white text-xs py-2"
                                >
                                    Cancelar adição
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppointmentModal;
