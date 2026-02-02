
import React, { useState } from 'react';
import { X, Calendar, Clock, User, Scissors, AlertTriangle, CheckCircle } from 'lucide-react';
import { appointmentService } from '../src/services/appointmentService';
import { supabase } from '../src/supabaseClient';

interface AppointmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: any; // Using any for flexibility with the enriched object from Schedule
    onUpdate: () => void; // Trigger refresh
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({ isOpen, onClose, appointment, onUpdate }) => {
    const [isCancelling, setIsCancelling] = useState(false);
    const [isEditingService, setIsEditingService] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [cancelReason, setCancelReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultMsg, setResultMsg] = useState<any>(null);

    // Fetch services when modal opens
    React.useEffect(() => {
        if (isOpen) {
            fetchServices();
        }
    }, [isOpen]);

    const fetchServices = async () => {
        const { data } = await supabase.from('services').select('*');
        if (data) setServices(data);
    };

    if (!isOpen || !appointment) return null;

    const handleConfirm = async () => {
        setLoading(true);
        const result = await appointmentService.confirmAppointment(appointment.id);
        setLoading(false);
        if (result.success) {
            onUpdate();
            onClose();
        } else {
            alert(result.message);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir este agendamento permanentemente?')) return;
        setLoading(true);
        const result = await appointmentService.deleteAppointment(appointment.id);
        setLoading(false);
        if (result.success) {
            onUpdate();
            onClose();
        } else {
            alert(result.message);
        }
    };

    const handleUpdateService = async (serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        setLoading(true);
        const result = await appointmentService.updateAppointment(appointment.id, {
            service_id: serviceId,
            price: service.price
        });
        setLoading(false);

        if (result.success) {
            setIsEditingService(false);
            onUpdate();
            onClose(); // Close to refresh the object prop
        } else {
            alert(result.message);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) {
            alert('Por favor, informe o motivo do cancelamento.');
            return;
        }
        setLoading(true);
        const result = await appointmentService.cancelAppointment(appointment.id, cancelReason);
        setLoading(false);

        if (result.success) {
            setResultMsg(result);
            setIsCancelling(false);
            // Don't close immediately so user sees the waitlist msg
        } else {
            alert(result.message);
        }
    };

    const handleClose = () => {
        setResultMsg(null);
        setIsCancelling(false);
        setCancelReason('');
        if (resultMsg?.success) onUpdate(); // Refresh on close if something changed
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-dark-900 w-full max-w-md rounded-t-2xl md:rounded-2xl border-t md:border border-gray-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
                {!resultMsg ? (
                    <>
                        <div className="p-5 md:p-6 border-b border-gray-800 flex justify-between items-center bg-dark-900/50">
                            <h3 className="text-xl font-bold text-white">Detalhes do Agendamento</h3>
                            <button onClick={handleClose} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-5 md:p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* Info */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex items-center gap-4 bg-gray-800/30 p-3 rounded-xl border border-gray-800/50">
                                    <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cliente</p>
                                        <p className="font-bold text-white">{appointment.client?.name || 'Cliente'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 bg-gray-800/30 p-3 rounded-xl border border-gray-800/50">
                                        <Scissors className="text-primary-500" size={18} />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Serviço</p>
                                            <p className="text-sm font-bold text-white truncate">{appointment.service?.name || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-800/30 p-3 rounded-xl border border-gray-800/50">
                                        <Clock className="text-primary-500" size={18} />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Horário</p>
                                            <p className="text-sm font-bold text-white">{appointment.startTime}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-800/30 p-3 rounded-xl border border-gray-800/50">
                                    <AlertTriangle size={18} className={appointment.status === 'Cancelado' ? 'text-red-500' : 'text-green-500'} />
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">Status do Agendamento</p>
                                        <p className={`text-sm font-black uppercase tracking-wider ${appointment.status === 'Cancelado' ? 'text-red-400' : 'text-green-400'}`}>{appointment.status}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            {appointment.status !== 'Cancelado' && !isCancelling && !isEditingService && (
                                <div className="grid grid-cols-1 gap-3">
                                    {appointment.status !== 'Confirmado' ? (
                                        <button
                                            onClick={handleConfirm}
                                            disabled={loading}
                                            className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white p-4 rounded-xl font-black transition-all shadow-lg shadow-green-600/10 disabled:opacity-50"
                                        >
                                            <CheckCircle size={20} /> Ativar/Confirmar Agenda
                                        </button>
                                    ) : (
                                        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-xl font-black flex items-center justify-center gap-2">
                                            <CheckCircle size={20} /> Agendamento Confirmado
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setIsEditingService(true)}
                                            disabled={loading}
                                            className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 p-3 rounded-xl font-bold transition-all disabled:opacity-50"
                                        >
                                            <Scissors size={18} /> Alterar
                                        </button>

                                        <button
                                            onClick={() => setIsCancelling(true)}
                                            disabled={loading}
                                            className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-yellow-500 border border-gray-700 p-3 rounded-xl font-bold transition-all disabled:opacity-50"
                                        >
                                            <AlertTriangle size={18} /> Cancelar
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleDelete}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/20 p-3 rounded-xl font-bold transition-all disabled:opacity-50 mt-2"
                                    >
                                        <X size={18} /> Excluir Permanentemente
                                    </button>
                                </div>
                            )}

                            {/* Service Management */}
                            {isEditingService && (
                                <div className="bg-primary-500/5 border border-primary-500/20 p-4 rounded-xl animate-in slide-in-from-bottom-2">
                                    <p className="text-xs font-black text-primary-500 uppercase mb-3 tracking-widest">Selecione novo serviço:</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {services.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => handleUpdateService(s.id)}
                                                className={`w-full text-left p-3 rounded-lg text-sm transition-all ${appointment.service_id === s.id ? 'bg-primary-500 text-dark-950 font-black shadow-lg shadow-primary-500/20' : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'}`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span>{s.name}</span>
                                                    <span className="opacity-70 font-mono">R$ {s.price}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setIsEditingService(false)}
                                        className="w-full mt-4 py-2 text-gray-500 hover:text-white text-xs font-bold uppercase"
                                    >
                                        Voltar
                                    </button>
                                </div>
                            )}

                            {/* Cancellation Form */}
                            {isCancelling && (
                                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl animate-in slide-in-from-bottom-2">
                                    <p className="text-xs font-black text-red-400 uppercase mb-3 tracking-widest">Motivo do cancelamento:</p>
                                    <textarea
                                        value={cancelReason}
                                        onChange={e => setCancelReason(e.target.value)}
                                        className="w-full bg-dark-950 border border-red-500/30 rounded-lg p-3 text-white text-sm mb-4 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all h-24"
                                        placeholder="Descreva brevemente o motivo..."
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCancel}
                                            disabled={loading}
                                            className="flex-1 bg-red-600 hover:bg-red-500 text-white p-3 rounded-lg font-bold text-sm disabled:opacity-50 shadow-lg shadow-red-600/10"
                                        >
                                            {loading ? 'Processando...' : 'Confirmar Cancelamento'}
                                        </button>
                                        <button
                                            onClick={() => setIsCancelling(false)}
                                            className="px-4 py-3 bg-gray-800 text-gray-400 rounded-lg font-bold text-sm hover:text-white transition-colors"
                                        >
                                            Voltar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    // Result View
                    <div className="p-8 text-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">Ação Realizada!</h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed px-4">{resultMsg.message}</p>

                        {resultMsg.waitlistTriggered && resultMsg.nextClient && (
                            <div className="bg-primary-500/5 border border-primary-500/20 p-5 rounded-2xl text-left mb-8 shadow-inner">
                                <p className="text-primary-500 text-[10px] font-black uppercase mb-3 flex items-center gap-1.5 tracking-widest">
                                    <AlertTriangle size={14} /> Fila de Espera Recomendada
                                </p>
                                <p className="text-white text-sm leading-relaxed mb-4">
                                    O cliente <strong>{resultMsg.nextClient.name}</strong> está aguardando por este horário!
                                </p>
                                <a
                                    href={`https://wa.me/${resultMsg.nextClient.phone.replace(/\D/g, '')}?text=Olá ${resultMsg.nextClient.name}, surgiu uma vaga para ${resultMsg.nextClient.serviceName} no horário que você queria! Vamos agendar?`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-dark-950 py-3.5 rounded-xl font-black text-sm transition-all shadow-xl shadow-primary-500/10"
                                >
                                    Chamar no WhatsApp
                                </a>
                            </div>
                        )}

                        <button onClick={handleClose} className="w-full bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl font-black transition-colors border border-gray-700">
                            Fechar Detalhes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppointmentDetailsModal;
