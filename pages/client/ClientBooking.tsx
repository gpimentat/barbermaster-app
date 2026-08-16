import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Check, ChevronRight, Scissors } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../src/supabaseClient';
import clientService from '../../src/services/clientService';

interface ClientBookingProps {
    tenant: any;
    clientData: any;
}

const ClientBooking: React.FC<ClientBookingProps> = ({ tenant, clientData }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [services, setServices] = useState<any[]>([]);
    const [barbers, setBarbers] = useState<any[]>([]);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);

    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedBarber, setSelectedBarber] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');

    const primaryColor = tenant?.settings?.app_config?.general?.primaryColor || '#eab308';

    useEffect(() => {
        loadServices();
        loadBarbers();
        generateAvailableDates();
    }, []);

    useEffect(() => {
        if (selectedDate && selectedBarber) {
            loadAvailableTimes();
        }
    }, [selectedDate, selectedBarber]);

    const loadServices = async () => {
        const { data } = await supabase
            .from('services')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('hidden', false); // Only show visible services

        if (data) setServices(data);
    };

    const loadBarbers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, name, avatar, role')
            .eq('tenant_id', tenant.id)
            .in('role', ['barber', 'Barbeiro', 'Master Barber']);

        if (data) setBarbers(data);
    };

    const generateAvailableDates = () => {
        const dates = [];
        const today = new Date();

        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }

        setAvailableDates(dates);
    };

    const loadAvailableTimes = async () => {
        if (!selectedDate || !selectedBarber || !selectedService) return;

        setLoading(true);
        try {
            const slots = await clientService.getAvailableSlots(
                tenant.id,
                selectedBarber.id,
                selectedDate,
                selectedService.duration_minutes || 30
            );
            setAvailableTimes(slots);
        } catch (error) {
            console.error('Error loading slots:', error);
            setAvailableTimes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmBooking = async () => {
        if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
            alert('Preencha todos os campos!');
            return;
        }

        setLoading(true);

        try {
            await clientService.createAppointment({
                tenantId: tenant.id,
                clientId: clientData.clientId,
                barberId: selectedBarber.id,
                serviceId: selectedService.id,
                date: selectedDate,
                time: selectedTime
            });

            alert('✅ Agendamento confirmado com sucesso!');
            navigate(`/app/${tenant.slug}`);
        } catch (error) {
            console.error('Booking error:', error);
            alert('Erro ao agendar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short'
        });
    };

    return (
        <div className="min-h-screen bg-gray-950 pb-32">
            {/* Header Fixo */}
            <div className="fixed top-0 left-0 right-0 bg-gray-900/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 z-50">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white"
                            >
                                <ChevronRight className="rotate-180" size={18} />
                            </button>
                        )}
                        <h1 className="text-lg font-bold text-white">
                            {step === 1 ? 'Agendar Horário' :
                                step === 2 ? 'Selecionar Barbeiro' :
                                    step === 3 ? 'Escolher Data' : 'Escolher Horário'}
                        </h1>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-2 mt-4">
                    {[1, 2, 3, 4].map(s => (
                        <div
                            key={s}
                            className="flex-1 h-1 rounded-full transition-all duration-500"
                            style={{
                                backgroundColor: step >= s ? primaryColor : '#374151',
                                boxShadow: step === s ? `0 0 10px ${primaryColor}40` : 'none'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Espaçador para o Header Fixo */}
            <div className="h-[120px]" />

            <div className="px-6 space-y-6">
                {/* Step 1: Serviço */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {services.length === 0 ? (
                            <div className="text-center py-12">
                                <Scissors className="mx-auto text-gray-600 mb-3" size={48} />
                                <h3 className="text-white font-bold mb-1">Nenhum serviço disponível</h3>
                                <p className="text-gray-400 text-sm">Esta barbearia ainda não cadastrou serviços. Volte em breve!</p>
                            </div>
                        ) : (
                        <div className="space-y-3">
                            {services.map(service => (
                                <button
                                    key={service.id}
                                    onClick={() => {
                                        setSelectedService(service);
                                        setStep(2);
                                    }}
                                    className="w-full bg-gray-900 border-2 rounded-xl p-4 flex items-center justify-between transition-all hover:scale-[1.02]"
                                    style={{
                                        borderColor: selectedService?.id === service.id ? primaryColor : '#374151'
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: `${primaryColor}20` }}
                                        >
                                            <Scissors style={{ color: primaryColor }} size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-white">{service.name}</p>
                                            <p className="text-xs text-gray-400">{service.duration || '30'} min</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {service.price_varies && <p className="text-xs text-gray-400">A partir de</p>}
                                        <p className="text-lg font-bold text-white">R$ {parseFloat(service.price || 0).toFixed(2)}</p>
                                        <ChevronRight className="text-gray-400 ml-auto" size={20} />
                                    </div>
                                </button>
                            ))}
                        </div>
                        )}
                    </div>
                )}

                {/* Step 2: Barbeiro */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {barbers.length === 0 ? (
                            <div className="text-center py-12">
                                <User className="mx-auto text-gray-600 mb-3" size={48} />
                                <h3 className="text-white font-bold mb-1">Nenhum profissional disponível</h3>
                                <p className="text-gray-400 text-sm">Esta barbearia ainda não cadastrou barbeiros. Volte em breve!</p>
                            </div>
                        ) : (
                        <div className="space-y-3">
                            {barbers.map(barber => (
                                <button
                                    key={barber.id}
                                    onClick={() => {
                                        setSelectedBarber(barber);
                                        setStep(3);
                                    }}
                                    className="w-full bg-gray-900 border-2 rounded-xl p-4 flex items-center justify-between transition-all hover:scale-[1.02]"
                                    style={{
                                        borderColor: selectedBarber?.id === barber.id ? primaryColor : '#374151'
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
                                            {barber.avatar ? (
                                                <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                                    {barber.name[0]}
                                                </div>
                                            )}
                                        </div>
                                        <p className="font-bold text-white">{barber.name}</p>
                                    </div>
                                    <ChevronRight className="text-gray-400" size={20} />
                                </button>
                            ))}
                        </div>
                        )}
                    </div>
                )}

                {/* Step 3: Data */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-2 gap-3">
                            {availableDates.map(date => {
                                const dateObj = new Date(date + 'T12:00:00');
                                const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                                const dayName = days[dateObj.getDay()];
                                const dayConfig = tenant?.settings?.app_config?.hours?.find((h: any) => h.day === dayName);
                                const isOpen = dayConfig?.isOpen;

                                return (
                                    <button
                                        key={date}
                                        disabled={!isOpen}
                                        onClick={() => {
                                            setSelectedDate(date);
                                            setStep(4);
                                        }}
                                        className={`bg-gray-900 border-2 rounded-xl p-4 text-center transition-all ${isOpen ? 'hover:scale-[1.02] cursor-pointer' : 'opacity-50 cursor-not-allowed grayscale'}`}
                                        style={{
                                            borderColor: selectedDate === date ? primaryColor : '#374151'
                                        }}
                                    >
                                        <Calendar className="mx-auto mb-2" style={{ color: isOpen ? primaryColor : '#6b7280' }} size={24} />
                                        <p className="text-white font-bold text-sm">{formatDate(date)}</p>
                                        {!isOpen && <p className="text-[10px] text-red-500 font-bold uppercase mt-1">Fechado</p>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 4: Horário */}
                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {availableTimes.length === 0 ? (
                            <div className="text-center py-8">
                                <Clock className="mx-auto text-gray-600 mb-2" size={48} />
                                <p className="text-gray-400">Nenhum horário disponível nesta data</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3">
                                {availableTimes.map(time => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className="bg-gray-900 border-2 rounded-xl p-3 text-center transition-all hover:scale-[1.02]"
                                        style={{
                                            borderColor: selectedTime === time ? primaryColor : '#374151'
                                        }}
                                    >
                                        <p className="text-white font-bold">{time}</p>
                                    </button>
                                ))}
                            </div>
                        )
                        }

                        {selectedTime && (
                            <div className="mt-6 bg-gray-900 rounded-xl p-5 border border-gray-800">
                                <h3 className="text-white font-bold mb-3">Resumo do Agendamento</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Serviço:</span>
                                        <span className="text-white font-medium">{selectedService?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Profissional:</span>
                                        <span className="text-white font-medium">{selectedBarber?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Data:</span>
                                        <span className="text-white font-medium">{formatDate(selectedDate)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Horário:</span>
                                        <span className="text-white font-medium">{selectedTime}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-gray-800">
                                        <span className="text-gray-400">Total:</span>
                                        <span className="text-lg font-bold text-white">
                                            R$ {parseFloat(selectedService?.price || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleConfirmBooking}
                                    disabled={loading}
                                    className="w-full mt-4 py-3 rounded-xl font-bold text-dark-950 flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? (
                                        'Confirmando...'
                                    ) : (
                                        <>
                                            <Check size={20} />
                                            Confirmar Agendamento
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientBooking;
